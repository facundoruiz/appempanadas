import { 
    auth,
    db 
} from './firebase';
import { 
    GoogleAuthProvider, 
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInAnonymously,
    updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Login con Google
export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await createUserProfile(result.user);
    
        onLoginSuccess(result.user); // Usar callback para login exitoso
        return result.user;
    } catch (error) {
        onAuthError(error); // Usar callback para error de autenticación
        throw error;
    }
   
};

// Login con email/password
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        onLoginSuccess(userCredential.user); // Usar callback para login exitoso
        return userCredential.user;
    } catch (error) {
        onAuthError(error); // Usar callback para error de autenticación
        throw error;
    }
};

// Registro con email/password
export const registerWithEmail = async (email, password) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(result.user);
        return result.user;
    } catch (error) {
        console.error('Error en registro:', error);
        throw error;
    }
};

// Registro anónimo con nombre de usuario
export const loginAnonymously = async (username) => {
    try {
        const result = await signInAnonymously(auth);
        // Actualizar el perfil con el nombre de usuario
        await updateProfile(result.user, {
            displayName: username
        });
        
        // Crear perfil en Firestore
        await createUserProfile({
            ...result.user,
            displayName: username
        });

        onLoginSuccess(result.user);
        return result.user;
    } catch (error) {
        onAuthError(error);
        throw error;
    }
};

// Crear perfil de usuario en Firestore
const createUserProfile = async (user) => {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            email: user.email || null,
            name: user.displayName || '',
            isAnonymous: user.isAnonymous,
            createdAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error creando perfil:', error);
        throw new Error('Error al crear perfil de usuario en Firestore');
    }
};

// Cerrar sesión
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error en logout:', error);
        throw error;
    }
};

// Funciones para manejar el estado de autenticación (Callbacks para UI)
function onLoginSuccess (user) {
    // Notificar a la UI para actualizar el estado a "logueado"
    console.log('Login exitoso para usuario:', user.email);
    // Aquí se podría llamar a un callback o dispatch de evento para actualizar la UI
}

function onAuthError(error) {
    console.error('Error en autenticación:', error);
    let errorMessage = 'Error al iniciar sesión';
    
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessage = 'Email inválido';
            break;
        case 'auth/user-disabled':
            errorMessage = 'Usuario deshabilitado';
            break;
        case 'auth/user-not-found':
            errorMessage = 'Usuario no encontrado';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Contraseña incorrecta';
            break;
        default:
            errorMessage = error.message;
    }
    // Notificar a la UI para mostrar el error
    alert(errorMessage); // Esto debería ser reemplazado por un método de UI más adecuado
}
