import os
import tempfile
import yt_dlp
from typing import Optional, Dict, Any
from pathlib import Path
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


class YouTubeService:
    """Сервис для скачивания видео с YouTube, TikTok и Instagram через yt-dlp"""
    
    def __init__(self, cookies_file: Optional[str] = None, instagram_cookies_file: Optional[str] = None):
        """
        Инициализация сервиса
        
        Args:
            cookies_file: Путь к файлу cookies для YouTube/TikTok (Netscape формат)
            instagram_cookies_file: Путь к файлу cookies для Instagram
        """
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        
        if cookies_file:
            self.cookies_file = cookies_file
        else:
            # Ищем cookies.txt в директории backend
            self.cookies_file = os.path.join(backend_dir, 'cookies.txt')
        
        # Если файл cookies не существует, просто не будем его использовать
        if not os.path.exists(self.cookies_file):
            self.cookies_file = None
        
        # Настройка cookies для Instagram
        if instagram_cookies_file:
            self.instagram_cookies_file = instagram_cookies_file
        else:
            # Ищем cookies_insta.txt в директории backend
            self.instagram_cookies_file = os.path.join(backend_dir, 'cookies_insta.txt')
        
        # Если файл cookies для Instagram не существует, просто не будем его использовать
        if not os.path.exists(self.instagram_cookies_file):
            self.instagram_cookies_file = None
    
    def is_youtube_url(self, url: str) -> bool:
        """Проверка, является ли URL ссылкой на YouTube"""
        youtube_domains = [
            'youtube.com',
            'youtu.be',
            'www.youtube.com',
            'm.youtube.com'
        ]
        return any(domain in url.lower() for domain in youtube_domains)
    
    def is_tiktok_url(self, url: str) -> bool:
        """Проверка, является ли URL ссылкой на TikTok"""
        tiktok_domains = [
            'tiktok.com',
            'www.tiktok.com',
            'vm.tiktok.com',
            'm.tiktok.com',
            'vt.tiktok.com'
        ]
        return any(domain in url.lower() for domain in tiktok_domains)
    
    def is_instagram_url(self, url: str) -> bool:
        """Проверка, является ли URL ссылкой на Instagram"""
        instagram_domains = [
            'instagram.com',
            'www.instagram.com',
            'm.instagram.com'
        ]
        return any(domain in url.lower() for domain in instagram_domains)
    
    def is_supported_url(self, url: str) -> bool:
        """Проверка, поддерживается ли URL для скачивания"""
        return self.is_youtube_url(url) or self.is_tiktok_url(url) or self.is_instagram_url(url)
    
    def download_video(self, url: str, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Скачивание видео с YouTube, TikTok или Instagram
        
        Args:
            url: URL видео на YouTube, TikTok или Instagram
            output_dir: Директория для сохранения (если None, используется временная)
        
        Returns:
            Dict с информацией о скачанном видео:
            {
                'file_path': путь к файлу,
                'title': название видео,
                'duration': длительность,
                'file_data': bytes данных файла,
                'mime_type': тип файла
            }
        """
        if not self.is_supported_url(url):
            raise ValueError(f"URL не поддерживается для скачивания (YouTube, TikTok или Instagram): {url}")
        
        # Настройки yt-dlp
        # Для TikTok используем другой формат, так как там обычно нет раздельных аудио/видео потоков
        if self.is_tiktok_url(url):
            format_selector = 'best[ext=mp4]/best'
        elif self.is_instagram_url(url):
            # Для Instagram используем лучший доступный формат
            format_selector = 'best[ext=mp4]/best'
        else:
            # Для YouTube можно использовать лучший формат с аудио
            format_selector = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        
        ydl_opts = {
            'format': format_selector,
            'outtmpl': '%(title)s.%(ext)s',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        # Добавляем cookies в зависимости от платформы
        if self.is_instagram_url(url):
            # Для Instagram используем специальные cookies
            if self.instagram_cookies_file and os.path.exists(self.instagram_cookies_file):
                ydl_opts['cookiefile'] = self.instagram_cookies_file
        else:
            # Для YouTube и TikTok используем обычные cookies
            if self.cookies_file and os.path.exists(self.cookies_file):
                ydl_opts['cookiefile'] = self.cookies_file
        
        # Используем временную директорию если не указана
        if output_dir is None:
            output_dir = tempfile.mkdtemp()
        else:
            os.makedirs(output_dir, exist_ok=True)
        
        ydl_opts['outtmpl'] = os.path.join(output_dir, '%(title)s.%(ext)s')
        
        video_info = {}
        file_path = None
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Получаем информацию о видео
                info = ydl.extract_info(url, download=False)
                video_info = {
                    'title': info.get('title', 'video'),
                    'duration': info.get('duration', 0),
                    'description': info.get('description', ''),
                }
                
                # Скачиваем видео
                ydl.download([url])
                
                # Ищем скачанный файл
                # yt-dlp может изменить расширение, поэтому ищем по названию
                title_safe = self._sanitize_filename(video_info['title'])
                for ext in ['mp4', 'webm', 'mkv', 'm4a']:
                    potential_path = os.path.join(output_dir, f"{title_safe}.{ext}")
                    if os.path.exists(potential_path):
                        file_path = potential_path
                        break
                
                # Если не нашли по точному названию, ищем любой файл в директории
                if not file_path:
                    files = list(Path(output_dir).glob('*'))
                    if files:
                        file_path = str(files[0])
                
                if not file_path or not os.path.exists(file_path):
                    raise FileNotFoundError("Не удалось найти скачанный файл")
                
                # Читаем файл
                with open(file_path, 'rb') as f:
                    file_data = f.read()
                
                # Определяем MIME тип
                mime_type = self._get_mime_type(file_path)
                
                result = {
                    'file_path': file_path,
                    'title': video_info['title'],
                    'duration': video_info['duration'],
                    'description': video_info.get('description', ''),
                    'file_data': file_data,
                    'mime_type': mime_type,
                    'file_size': len(file_data),
                    'temp_dir': output_dir  # Сохраняем для последующей очистки
                }
                
                # Удаляем временный файл (данные уже в памяти)
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except:
                    pass
                
                return result
        
        except Exception as e:
            # Очищаем временные файлы при ошибке
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
            raise Exception(f"Ошибка при скачивании видео: {str(e)}")
    
    def _sanitize_filename(self, filename: str) -> str:
        """Очистка имени файла от недопустимых символов"""
        import re
        # Убираем недопустимые символы для Windows/Linux
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        # Ограничиваем длину
        if len(filename) > 200:
            filename = filename[:200]
        return filename.strip()
    
    def _get_mime_type(self, file_path: str) -> str:
        """Определение MIME типа файла"""
        ext = Path(file_path).suffix.lower()
        mime_types = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska',
            '.m4a': 'audio/mp4',
            '.mp3': 'audio/mpeg',
        }
        return mime_types.get(ext, 'video/mp4')

