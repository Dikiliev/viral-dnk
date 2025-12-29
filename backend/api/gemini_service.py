import os
import time
import base64
import json
import re
from typing import List, Dict, Any, Optional
from google.genai import Client
from google.genai import types as genai_types
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import io
from .kie_service import KieService


class GeminiService:
    """Сервис для работы с Gemini API"""
    
    def __init__(self):
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        self.client = Client(api_key=api_key)
    
    def _safe_json_parse(self, text: str, fallback: Any) -> Any:
        """Безопасный парсинг JSON из ответа"""
        if not text:
            return fallback
        try:
            # Убираем markdown код блоки
            cleaned = text.replace('```json\n', '').replace('\n```', '').strip()
            if cleaned:
                return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        
        # Пытаемся найти JSON в тексте
        try:
            first_obj = re.search(r'\{[\s\S]*\}', text)
            first_arr = re.search(r'\[[\s\S]*\]', text)
            candidate = first_obj.group(0) if first_obj else (first_arr.group(0) if first_arr else None)
            if candidate:
                return json.loads(candidate)
        except (json.JSONDecodeError, AttributeError):
            pass
        
        return fallback
    
    def _extract_sources(self, resp) -> List[Dict[str, str]]:
        """Извлечение источников из ответа"""
        sources = []
        try:
            if hasattr(resp, 'candidates') and resp.candidates:
                candidate = resp.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    chunks = getattr(candidate.grounding_metadata, 'grounding_chunks', [])
                    for chunk in chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            uri = getattr(chunk.web, 'uri', None)
                            if uri:
                                sources.append({
                                    'title': getattr(chunk.web, 'title', None),
                                    'uri': uri
                                })
        except Exception:
            pass
        return sources
    
    def _with_retries(self, fn, retries=2, base_delay_ms=400):
        """Повторные попытки при ошибках"""
        base = base_delay_ms
        last_err = None
        
        for attempt in range(retries + 1):
            try:
                return fn()
            except Exception as e:
                last_err = e
                err_msg = str(e).lower()
                is_retryable = '500' in err_msg or 'xhr' in err_msg or 'proxyunarycall' in err_msg or 'retry' in err_msg
                if attempt == retries or not is_retryable:
                    break
                time.sleep(base * (2 ** attempt) / 1000)
        
        raise last_err
    
    def analyze_content(self, inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Анализ контента для выявления ДНК успеха
        
        Args:
            inputs: Список источников [{'type': 'url', 'value': '...', 'label': '...'}, ...]
        
        Returns:
            {
                'transcript': [...],
                'stylePassport': {...},
                'patterns': [...],
                'sources': [...]
            }
        """
        # Схема для анализа
        ANALYZE_SCHEMA = {
            "type": "object",
            "properties": {
                "transcript": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "string"},
                            "end": {"type": "string"},
                            "text": {"type": "string"},
                        },
                        "required": ["start", "end", "text"],
                    },
                    "description": "Объединенный или наиболее репрезентативный транскрипт.",
                },
                "stylePassport": {
                    "type": "object",
                    "properties": {
                        "structure": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "segment": {"type": "string"},
                                    "start": {"type": "string"},
                                    "end": {"type": "string"},
                                    "description": {"type": "string"},
                                },
                                "required": ["segment", "start", "end", "description"],
                            },
                        },
                        "speech_rate_wpm": {"type": "number"},
                        "catchphrases": {"type": "array", "items": {"type": "string"}},
                        "fillers": {"type": "array", "items": {"type": "string"}},
                        "sentiment": {"type": "string"},
                        "tone_tags": {"type": "array", "items": {"type": "string"}},
                        "visual_context": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["structure", "speech_rate_wpm", "catchphrases", "fillers", "sentiment", "tone_tags", "visual_context"],
                },
                "patterns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "impact": {"type": "string", "enum": ["Высокий", "Средний", "Низкий"]},
                            "evidence_segments": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["name", "description", "impact", "evidence_segments"],
                    },
                    "description": "Общие паттерны успеха, найденные во ВСЕХ предоставленных видео.",
                },
            },
            "required": ["transcript", "stylePassport", "patterns"],
        }
        
        content_parts = []
        has_url = False
        
        for input_item in inputs:
            if input_item.get('type') == 'url':
                has_url = True
                content_parts.append({
                    "text": f"ССЫЛКА НА ВИДЕО ДЛЯ АНАЛИЗА: {input_item['value']}"
                })
            else:
                # Для файлов - нужно передать base64 данные
                file_data = input_item.get('value', {})
                if isinstance(file_data, dict) and 'data' in file_data:
                    content_parts.append({
                        "inline_data": {
                            "data": file_data['data'],
                            "mime_type": file_data.get('mimeType', 'video/mp4')
                        }
                    })
        
        system_instruction = f"""
            Ты — высококлассный AI-продюсер. Тебе предоставлено {len(inputs)} видео.
            Твоя задача — провести глубокий анализ КОНТЕНТА САМИХ РОЛИКОВ, чтобы выявить "ДНК Успеха".
            
            СТРОЖАЙШИЕ ПРАВИЛА:
            1. ТЫ ДОЛЖЕН СМОТРЕТЬ ВИДЕО. Если это ссылка, используй 'googleSearch' только для поиска транскрипта или описания ПРОИСХОДЯЩЕГО ВНУТРИ РОЛИКА.
            2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать: описание под видео, комментарии, информацию о канале или количество просмотров. Это "шум".
            3. АНАЛИЗИРУЙ ТОЛЬКО: визуальный ряд, мимику, жесты, структуру монтажа, темп речи и содержание сказанного в самом видео.
            4. Ищи ОБЩИЕ ПРИЕМЫ (паттерны) во всех предоставленных видео. Например: все начинаются с резкого вопроса, во всех используется быстрый зум-эффект и т.д.
            5. Выяви "StylePassport" — это среднее арифметическое стиля всех этих роликов.
            
            Ответ должен быть СТРОГО в формате JSON на РУССКОМ языке.
        """
        
        prompt_text = "Проведи групповой анализ DNA. Сфокусируйся на том, ЧТО ПРОИСХОДИТ ВНУТРИ ВИДЕО. Выяви общие паттерны успеха."
        
        def _analyze():
            # Формируем parts правильно для API
            parts = []
            for part in content_parts:
                if "text" in part:
                    parts.append(genai_types.Part(text=part["text"]))
                elif "inline_data" in part:
                    parts.append(genai_types.Part(
                        inline_data=genai_types.Blob(
                            data=part["inline_data"]["data"],
                            mime_type=part["inline_data"]["mime_type"]
                        )
                    ))
            parts.append(genai_types.Part(text=prompt_text))
            
            # Используем правильный API для Python
            resp = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=parts,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=ANALYZE_SCHEMA,
                    tools=[genai_types.Tool(google_search={})] if has_url else None,
                ),
            )
            
            # Получаем текст из ответа
            text = ""
            if hasattr(resp, 'text'):
                text = resp.text
            elif hasattr(resp, 'candidates') and resp.candidates:
                for candidate in resp.candidates:
                    if hasattr(candidate, 'content') and candidate.content:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                text += part.text
            
            data = self._safe_json_parse(text, None)
            
            if not data or (not data.get('transcript') and not data.get('stylePassport', {}).get('tone_tags')):
                raise ValueError("Не удалось извлечь ДНК. Убедитесь, что видео содержат четкий контент для анализа.")
            
            return {
                'transcript': data.get('transcript', []),
                'stylePassport': data.get('stylePassport', {}),
                'patterns': data.get('patterns', []),
                'sources': self._extract_sources(resp),
            }
        
        return self._with_retries(_analyze)
    
    def generate_script(self, topic: str, style_passport: Dict, patterns: List[Dict]) -> List[Dict[str, str]]:
        """
        Генерация сценария на основе ДНК
        
        Args:
            topic: Тема сценария
            style_passport: Паспорт стиля
            patterns: Паттерны успеха
        
        Returns:
            Список сегментов сценария
        """
        SCRIPT_SCHEMA = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "timeframe": {"type": "string"},
                    "visual": {"type": "string"},
                    "audio": {"type": "string"},
                },
                "required": ["timeframe", "visual", "audio"],
            },
        }
        
        prompt = f"""Создай сценарий для видео: "{topic}". Используй выявленное ДНК группы видео. Стиль: {json.dumps(style_passport, ensure_ascii=False)}. Паттерны: {json.dumps([p.get('name', '') for p in patterns], ensure_ascii=False)}. Только JSON."""
        
        def _generate():
            resp = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=[genai_types.Part(text=prompt)],
                config=genai_types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                    response_schema=SCRIPT_SCHEMA,
                ),
            )
            
            text = ""
            if hasattr(resp, 'text'):
                text = resp.text
            elif hasattr(resp, 'candidates') and resp.candidates:
                for candidate in resp.candidates:
                    if hasattr(candidate, 'content') and candidate.content:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                text += part.text
            
            return self._safe_json_parse(text, [])
        
        return self._with_retries(_generate)
    
        """
        Генерация речи из текста
        
        Args:
            text: Текст для озвучки
        
        Returns:
            WAV файл в виде bytes
        """
        response = self.client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=[genai_types.Part(text=f"Say naturally: {text}")],
            config=genai_types.GenerateContentConfig(
                response_modalities=[genai_types.Modality.AUDIO],
                speech_config=genai_types.SpeechConfig(
                    voice_config=genai_types.VoiceConfig(
                        prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                            voice_name="Kore"
                        )
                    )
                )
            ),
        )
        
        base64_audio = None
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            base64_audio = part.inline_data.data
                            break
                if base64_audio:
                    break
        
        if not base64_audio:
            raise ValueError("Audio generation failed")
        
        # Декодируем PCM данные
        pcm_data = base64.b64decode(base64_audio)
        
        # Создаем WAV заголовок
        sample_rate = 24000
        wav_header = self._create_wav_header(len(pcm_data), sample_rate)
        
        # Объединяем заголовок и данные
        wav_file = wav_header + pcm_data
        
        return wav_file
    
    def _create_wav_header(self, pcm_length: int, sample_rate: int) -> bytes:
        """Создание WAV заголовка"""
        header = bytearray(44)
        header[0:4] = b'RIFF'
        header[4:8] = (36 + pcm_length).to_bytes(4, 'little')
        header[8:12] = b'WAVE'
        header[12:16] = b'fmt '
        header[16:20] = (16).to_bytes(4, 'little')
        header[20:22] = (1).to_bytes(2, 'little')  # PCM
        header[22:24] = (1).to_bytes(2, 'little')  # Mono
        header[24:28] = sample_rate.to_bytes(4, 'little')
        header[28:32] = (sample_rate * 2).to_bytes(4, 'little')
        header[32:34] = (2).to_bytes(2, 'little')  # Block align
        header[34:36] = (16).to_bytes(2, 'little')  # Bits per sample
        header[36:40] = b'data'
        header[40:44] = pcm_length.to_bytes(4, 'little')
        return bytes(header)
