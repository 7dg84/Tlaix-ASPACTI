# Tlaix - ASPACTI

Este repositorio contiene la versión personalizada del proyecto **Tlaix** adaptada para la aplicación **ASPACTI**. El proyecto está estructurado como un monorreporsitorio administrado con Docker Compose.

## Estructura del Monorreporsitorio

*   **`backend/`**: Servidor de API desarrollado en **Django** con Django REST Framework y panel de administración **Unfold Admin**.
*   **`frontend/`**: Aplicación de cliente web SPA desarrollada en **React (TypeScript)**, empaquetada con **Vite** y **Tailwind CSS**. En producción, se compila y se sirve mediante **Nginx**.

---

## Requisitos Previos

*   **Docker** y **Docker Compose** instalados en el sistema de despliegue.
*   Conexión de red para descargar y construir las imágenes.

---

## Instrucciones de Despliegue

Sigue estos pasos para desplegar el proyecto en tu entorno local o servidor de producción:

### 1. Configurar Variables de Entorno
Copia la plantilla de ejemplo `.env.example` en la raíz del proyecto para crear tu archivo `.env`:

```bash
cp .env.example .env
```

Abre el archivo `.env` y asegúrate de configurar correctamente los valores requeridos, en especial:
*   `POSTGRES_PASSWORD`: Contraseña para la base de datos de PostgreSQL.
*   `DJANGO_SECRET_KEY`: Una clave aleatoria y segura para Django.
*   `COMPANY`: Configurado como `ASPACTI`.

### 2. Construir y Levantar los Contenedores
Ejecuta el comando para compilar las imágenes e iniciar los contenedores en segundo plano (`detached`):

```bash
docker compose up --build -d
```

Este comando levantará tres servicios principales:
1.  `db`: Base de datos PostgreSQL (Puerto `5432`).
2.  `django`: Backend de Django REST Framework (Puerto `8000`).
3.  `react`: Frontend de React servido por Nginx (Puerto `80`).

### 3. Ejecutar Migraciones y Crear Administrador
Una vez que los contenedores estén en ejecución, debes preparar la base de datos de Django:

1.  **Ejecutar migraciones de la base de datos**:
    ```bash
    docker compose exec django python manage.py migrate
    ```
2.  **Crear un superusuario de administración**:
    ```bash
    docker compose exec django python manage.py createsuperuser
    ```
    *(Sigue las indicaciones en pantalla para definir tu usuario, correo y contraseña de acceso al panel de administración).*

3.  *(Opcional)* **Recopilar archivos estáticos del Admin**:
    ```bash
    docker compose exec django python manage.py collectstatic --noinput
    ```

---

## Puertos y Acceso de Servicios

Una vez completado el despliegue, podrás acceder a los servicios en las siguientes direcciones:

*   **Aplicación Web (React)**: [http://localhost](http://localhost) (Puerto `80`).
*   **API Backend (Django)**: [http://localhost:8000](http://localhost:8000) (Puerto `8000`).
*   **Django Unfold Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/).

---

## Perfiles Opcionales de Docker Compose

El archivo `docker-compose.yml` admite perfiles adicionales para servicios auxiliares:

*   **Nginx Proxy Manager**: Utilizado para gestionar redirecciones DNS locales o proxies reversos.
    ```bash
    docker compose --profile npm up -d
    ```
*   **Cloudflare Tunnel**: Utilizado para exponer el puerto de Django a través de un túnel seguro a un dominio público de Cloudflare.
    ```bash
    docker compose --profile cloudflare up -d
    ```
