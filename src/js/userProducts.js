import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export class UserProductManager {
    constructor() {
        this.productsCollection = collection(db, 'userProducts');
    }

    // Obtener productos para un usuario específico
    async getUserProducts(userId, orderId) {
        try {
            const q = query(
                this.productsCollection,
                where('userId', '==', userId),
                where('orderId', '==', orderId)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    }

    // Agregar producto personalizado
    async addUserProduct(userId, orderId, productData) {
        try {
            const newProduct = {
                ...productData,
                userId,
                orderId,
                createdAt: new Date(),
                active: true,
                isCustom: true
            };

            const docRef = await addDoc(this.productsCollection, newProduct);
            return {
                id: docRef.id,
                ...newProduct
            };
        } catch (error) {
            console.error('Error al agregar producto:', error);
            throw error;
        }
    }

    // Actualizar producto
    async updateUserProduct(productId, updates) {
        try {
            const productRef = doc(this.productsCollection, productId);
            await updateDoc(productRef, updates);
            return true;
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            throw error;
        }
    }

    // Eliminar producto
    async deleteUserProduct(productId) {
        try {
            await deleteDoc(doc(this.productsCollection, productId));
            return true;
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            throw error;
        }
    }
}

export const userProductManager = new UserProductManager(); 