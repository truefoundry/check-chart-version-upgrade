FROM python:3.7-slim

ADD . /app
WORKDIR /app

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

CMD ["python", "check_chart_version_upgrade.py"]
