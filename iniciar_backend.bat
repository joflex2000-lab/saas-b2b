@echo off
echo === Iniciando Backend (Cerebro) ===
cd backend
call venv\Scripts\activate
echo Instalando dependencias faltantes por si acaso...
pip install djangorestframework-simplejwt
echo Aplicando cambios en base de datos...
python manage.py migrate
echo Iniciando Servidor...
python manage.py runserver
pause
