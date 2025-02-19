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
        return result.user;
    } catch (error) {
        console.error('Error en login con Google:', error);
        throw error;
    }
};

// Login con email/password
export const loginWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Error en login con email:', error);
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
