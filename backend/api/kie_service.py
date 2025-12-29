import os
import requests
import json
from typing import Dict, Any, Optional
from django.conf import settings


class KieService:
    """Сервис для работы с Kie.ai API"""
    
    BASE_URL = "https://api.kie.ai/api/v1"
    
    def __init__(self):
        self.api_key = os.environ.get('KIE_API_KEY')
        if not self.api_key:
            raise ValueError("KIE_API_KEY environment variable is not set")
    
    def _get_headers(self) -> Dict[str, str]:
        """Получение заголовков для запросов"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_video_task(
        self,
        model: str,
        prompt: str,
        additional_notes: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        mode: str = "normal",
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Создание задачи на генерацию видео
        
        Args:
            model: Модель для генерации ('sora-2-text-to-video' или 'grok-imagine/text-to-video')
            prompt: Промпт для генерации видео
            additional_notes: Дополнительные пожелания пользователя
            aspect_ratio: Соотношение сторон (для grok-imagine: "2:3" - portrait, "3:2" - landscape, "1:1" - square)
            mode: Режим генерации (для grok-imagine: "fun", "normal", "spicy")
            callback_url: URL для callback уведомлений
        
        Returns:
            Dict с информацией о задаче (taskId и т.д.)
        """
        # Формируем финальный промпт
        final_prompt = prompt
        if additional_notes:
            final_prompt = f"{prompt}\n\nДополнительные пожелания: {additional_notes}"
        
        # Подготовка данных в зависимости от модели
        if model == 'sora-2-text-to-video':
            # Для Sora 2 не передаем aspect_ratio и mode
            payload = {
                'model': 'sora-2-text-to-video',
                'input': {
                    'prompt': final_prompt
                }
            }
        elif model == 'grok-imagine/text-to-video':
            # Для Grok Imagine допустимые значения aspect_ratio: "2:3", "3:2", "1:1"
            # Default: "2:3" (Portrait orientation)
            valid_aspect_ratios = ["2:3", "3:2", "1:1"]
            if not aspect_ratio or aspect_ratio not in valid_aspect_ratios:
                aspect_ratio = "2:3"  # Используем значение по умолчанию
            
            # Дополнительная проверка - убеждаемся, что значение точно в списке
            if aspect_ratio not in valid_aspect_ratios:
                raise ValueError(f"aspect_ratio '{aspect_ratio}' не в списке допустимых значений: {valid_aspect_ratios}")
            
            # Для mode допустимые значения: "fun", "normal", "spicy"
            # Default: "normal"
            valid_modes = ["fun", "normal", "spicy"]
            if mode not in valid_modes:
                mode = "normal"  # Используем значение по умолчанию
            
            payload = {
                'model': 'grok-imagine/text-to-video',
                'input': {
                    'prompt': final_prompt,
                    'aspect_ratio': str(aspect_ratio),
                    'mode': str(mode)
                }
            }
        else:
            raise ValueError(f"Unsupported model: {model}")
        
        if callback_url:
            payload['callBackUrl'] = callback_url
        
        response = requests.post(
            f"{self.BASE_URL}/jobs/createTask",
            headers=self._get_headers(),
            json=payload,
            timeout=30
        )
        
        if not response.ok:
            try:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_msg = error_data.get('msg', f'HTTP {response.status_code}')
            except:
                error_msg = f'HTTP {response.status_code}: {response.text[:200]}'
            raise Exception(f"Ошибка создания задачи: {error_msg}")
        
        try:
            result = response.json()
            if not result:
                raise Exception("Пустой ответ от API Kie.ai")
            return result
        except Exception as e:
            raise Exception(f"Ошибка парсинга ответа от Kie.ai: {str(e)}")
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Получение статуса задачи
        
        Args:
            task_id: ID задачи
        
        Returns:
            Dict с информацией о статусе задачи
        """
        response = requests.get(
            f"{self.BASE_URL}/jobs/recordInfo",
            headers=self._get_headers(),
            params={'taskId': task_id},
            timeout=30
        )
        
        if not response.ok:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error_msg = error_data.get('msg', f'HTTP {response.status_code}')
            raise Exception(f"Ошибка получения статуса задачи: {error_msg}")
        
        return response.json()
    
    def poll_task_until_complete(
        self,
        task_id: str,
        max_attempts: int = 60,
        interval: int = 5
    ) -> Dict[str, Any]:
        """
        Ожидание завершения задачи с периодическим опросом
        
        Args:
            task_id: ID задачи
            max_attempts: Максимальное количество попыток
            interval: Интервал между попытками в секундах
        
        Returns:
            Dict с результатами генерации
        """
        import time
        
        for attempt in range(max_attempts):
            status_data = self.get_task_status(task_id)
            data = status_data.get('data', {})
            state = data.get('state', 'waiting')
            
            if state == 'success':
                # Парсим resultJson
                result_json = data.get('resultJson', '{}')
                try:
                    result_data = json.loads(result_json) if isinstance(result_json, str) else result_json
                    return {
                        'status': 'success',
                        'task_id': task_id,
                        'result': result_data
                    }
                except json.JSONDecodeError:
                    return {
                        'status': 'success',
                        'task_id': task_id,
                        'result': {'resultUrls': []}
                    }
            
            if state == 'fail':
                fail_msg = data.get('failMsg', 'Неизвестная ошибка')
                raise Exception(f"Генерация видео не удалась: {fail_msg}")
            
            # Ждем перед следующей попыткой
            if attempt < max_attempts - 1:
                time.sleep(interval)
        
        raise Exception(f"Задача не завершилась за {max_attempts * interval} секунд")
    
    def create_image_task(
        self,
        model: str,
        prompt: str,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Создание задачи на генерацию изображения
        
        Args:
            model: Модель для генерации (например, 'flux-2', 'grok-imagine', 'seedream' и т.д.)
            prompt: Промпт для генерации изображения
            callback_url: URL для callback уведомлений
        
        Returns:
            Dict с информацией о задаче (taskId и т.д.)
        """
        payload = {
            'model': model,
            'input': {
                'prompt': prompt
            }
        }
        
        if callback_url:
            payload['callBackUrl'] = callback_url
        
        response = requests.post(
            f"{self.BASE_URL}/jobs/createTask",
            headers=self._get_headers(),
            json=payload,
            timeout=30
        )
        
        if not response.ok:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error_msg = error_data.get('msg', f'HTTP {response.status_code}')
            raise Exception(f"Ошибка создания задачи на генерацию изображения: {error_msg}")
        
        return response.json()
    
    def download_file_from_url(self, url: str) -> bytes:
        """
        Скачивание файла по URL
        
        Args:
            url: URL файла
        
        Returns:
            Bytes файла
        """
        response = requests.get(url, timeout=60)
        if not response.ok:
            raise Exception(f"Ошибка скачивания файла: HTTP {response.status_code}")
        return response.content

