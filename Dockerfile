FROM python:3.13-alpine

RUN mkdir -p /home/project

WORKDIR /home/project

COPY ./ /home/project

RUN pip install -r ./requirements.txt

# El CMD para iniciar el servidor de desarrollo
# Asumimos que "start:dev" usa nodemon o similar para recargar con los cambios

EXPOSE 8000

CMD [ "python", "manage.py", "runserver" ]
