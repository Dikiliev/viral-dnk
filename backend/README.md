# Backend API для ViralDNA

Django REST Framework API для анализа ДНК успеха и генерации контента.

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# или
source .venv/bin/activate  # Linux/Mac
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
   - `GEMINI_API_KEY` - ваш API ключ от Google Gemini
   - Настройки базы данных PostgreSQL

5. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE dnk_db;
```

6. Выполните миграции:
```bash
python manage.py makemigrations
python manage.py migrate
```

7. Создайте суперпользователя (опционально):
```bash
python manage.py createsuperuser
```

8. Запустите сервер:
```bash
python manage.py runserver
```

## API Endpoints

### Анализы

- `POST /api/analyses/` - Создать новый анализ
- `GET /api/analyses/` - Список всех анализов
- `GET /api/analyses/{id}/` - Получить анализ по ID
- `GET /api/analyses/history/` - История анализов (последние 20)

### Сценарии

- `POST /api/scripts/` - Создать новый сценарий
- `GET /api/scripts/` - Список всех сценариев
- `GET /api/scripts/{id}/` - Получить сценарий по ID
- `POST /api/scripts/{id}/generate_media/` - Сгенерировать медиа для сегмента

## Структура данных

### Создание анализа

```json
POST /api/analyses/
{
  "sources": [
    {
      "type": "url",
      "value": "https://youtube.com/watch?v=...",
      "label": "Video 1"
    },
    {
      "type": "file",
      "value": {
        "data": "base64_encoded_video_data",
        "mimeType": "video/mp4"
      },
      "label": "video.mp4"
    }
  ]
}
```

### Создание сценария

```json
POST /api/scripts/
{
  "analysis_id": "uuid-here",
  "topic": "Тема нового видео"
}
```

### Генерация медиа

```json
POST /api/scripts/{script_id}/generate_media/
{
  "segment_id": "uuid-here"
}
```

## Модели данных

- **Analysis** - Результаты анализа ДНК успеха
- **AnalysisSource** - Источники анализа (URL или файлы)
- **Script** - Сценарии, созданные на основе анализа
- **ScriptSegment** - Сегменты сценария
- **MediaFile** - Медиа файлы для сегментов

## Технологии

- Django 6.0
- Django REST Framework
- PostgreSQL
- Google Gemini API
- django-cors-headers

