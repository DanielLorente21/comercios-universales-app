rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function getUserRole() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol;
    }
    
    function getUserDepartamento() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.departamento;
    }
    
    function isCloudFunction() {
      return request.auth == null;
    }
    
    match /usuarios/{userId} {
      allow read, write: if isCloudFunction();
      allow read: if request.auth != null && (
        request.auth.uid == userId ||
        getUserRole() in ['dueno', 'contralor']
      );
      allow write: if request.auth != null && 
        getUserRole() in ['dueno', 'contralor'];
    }
    
    match /permisos/{permiso} {
      allow read, write: if isCloudFunction();
      allow read: if request.auth != null && (
        getUserRole() in ['dueno', 'contralor'] ||
        (getUserRole() == 'jefe' && resource.data.departamento == getUserDepartamento()) ||
        resource.data.codigo == 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.codigo
      );
      allow write: if request.auth != null && (
        (request.resource.data.estado == 'Pendiente' && request.auth != null) ||
        (getUserRole() in ['jefe', 'contralor', 'dueno'])
      );
    }
    
    match /notificaciones/{notif} {
      allow read, write: if isCloudFunction();
      allow read: if request.auth != null && 
        resource.data.codigo == 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.codigo;
      allow write: if request.auth != null;
    }
    
    match /logs_acumulacion/{log} {
      allow read, write: if isCloudFunction();
      allow read: if request.auth != null && 
        getUserRole() in ['dueno', 'contralor'];
    }
  }
}