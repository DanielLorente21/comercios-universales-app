# — Sistema de Gestión de Permisos

Aplicación móvil y web para gestión de permisos y ausencias de empleados, desarrollada con **React Native + Expo** y **Firebase** como backend.

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/solucontrol.git
cd solucontrol
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env




---

## 🏗️ Estructura del proyecto

```
solucontrol/
├── App.js                  # Componente principal
├── constantsconfig.js      # Configuración centralizada (sin claves hardcodeadas)
├── AdminUserModal.js       # Modal de gestión de usuarios
├── SuperAdmin.js           # Panel de superadministrador
├── GestionFestivos.js      # Gestión de días festivos
├── functions/              # Firebase Cloud Functions
├── firestore.rules         # Reglas de seguridad de Firestore
├── firebase.json           # Configuración de Firebase Hosting
├── .env.example            # Plantilla de variables de entorno
└── .gitignore              # Archivos excluidos del repositorio
```

---

## 🔐 Seguridad

- Las API keys y credenciales **nunca** están en el código fuente
- Todas las claves se cargan desde el archivo `.env` (no incluido en el repo)
- El archivo `google-services.json` está excluido del repositorio
- Las reglas de Firestore están configuradas para restringir acceso por rol

---

## 🔧 Stack tecnológico

- **Frontend**: React Native + Expo (~54)
- **Backend**: Firebase Firestore + Firebase Auth + Cloud Functions
- **Hosting**: Firebase Hosting
- **Notificaciones**: Expo Notifications (FCM)

