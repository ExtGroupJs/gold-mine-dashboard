FROM python:3.13-alpine

RUN mkdir -p /home/project

WORKDIR /home/project

COPY ./ /home/project

RUN pip install -r ./requirements.txt

EXPOSE 8000

# Corregido: especificar la dirección de host para que sea accesible desde fuera del contenedor
CMD [ "python3", "./manage.py", "runserver", "0.0.0.0:8000" ]