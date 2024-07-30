FROM python:3.7-slim

ADD . /app
WORKDIR /app

RUN pip install --upgrade pip requests

CMD ["python", "check_chart_version_upgrade.py"]
