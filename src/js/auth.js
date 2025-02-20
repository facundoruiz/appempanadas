import { 
    auth,
    db 
} from './firebase';
import { 
    GoogleAuthProvider, 
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Login con Google
export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await createUserProfile(result.user);
    
        handleSuccessfulLogin();
        return result.user;
    } catch (error) {
        handleAuthError(error);
        throw error;
    }
   
};

// Login con email/password
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        handleSuccessfulLogin();
        return userCredential.user;
    } catch (error) {
        handleAuthError(error);
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

// Crear perfil de usuario en Firestore
const createUserProfile = async (user) => {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            email: user.email,
            name: user.displayName || '',
            createdAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error creando perfil:', error);
        throw error;
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

// Funciones de manejo de UI
function handleSuccessfulLogin () {
    try {
        const loginSection = document.getElementById('loginSection');
        const mainSection = document.getElementById('mainSection');
        const userNameElement = document.getElementById('userName');

        if (!loginSection || !mainSection) {
            console.error('Elementos de sección no encontrados');
            return;
        }

        loginSection.style.display = 'none';
        mainSection.style.display = 'block';
        
        if (userNameElement && currentUser) {
            userNameElement.textContent = currentUser.email || 'Usuario';
        }

        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

    } catch (error) {
        console.error('Error al manejar login exitoso:', error);
        alert('Error al cargar la interfaz después del login');
    }
}

function handleAuthError(error) {
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
    
    alert(errorMessage);
}