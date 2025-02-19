import { db } from './firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    getDocs, 
    deleteDoc,
    serverTimestamp 
} from 'firebase/firestore';

export class UserProductStore {
    constructor() {
        this.userProductsCollection = collection(db, 'userProductStore');
    }

    // Obtener todos los productos de un usuario
    async getUserProducts(userId) {
        try {
            const q = query(
                this.userProductsCollection,
                where('userId', '==', userId),
                where('active', '==', true)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al obtener productos del usuario:', error);
            throw error;
        }
    }

    // Agregar un nuevo producto para el usuario
    async addUserProduct(userId, productData) {
        try {
            const newProduct = {
                ...productData,
                userId,
                createdAt: serverTimestamp(),
                active: true,
                isCustom: true
            };

            const docRef = await addDoc(this.userProductsCollection, newProduct);
            return {
                id: docRef.id,
                ...newProduct
            };
        } catch (error) {
            console.error('Error al agregar producto del usuario:', error);
            throw error;
        }
    }

    // Actualizar producto del usuario
    async updateUserProduct(productId, updates) {
        try {
            const productRef = doc(this.userProductsCollection, productId);
            await updateDoc(productRef, updates);
            return true;
        } catch (error) {
            console.error('Error al actualizar producto del usuario:', error);
            throw error;
        }
    }

    // Desactivar producto del usuario (soft delete)
    async deleteUserProduct(productId) {
        try {
            const productRef = doc(this.userProductsCollection, productId);
            await updateDoc(productRef, {
                active: false,
                deletedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error al eliminar producto del usuario:', error);
            throw error;
        }
    }

    // Copiar productos de un usuario a un pedido específico
    async copyUserProductsToOrder(userId, orderId) {
        try {
            // Obtener todos los productos activos del usuario
            const userProducts = await this.getUserProducts(userId);
            
            // Crear las entradas en la colección de productos del pedido
            const orderProductsCollection = collection(db, 'orderProducts');
            const copyPromises = userProducts.map(product => {
                const orderProduct = {
                    ...product,
                    orderId,
                    copiedFrom: product.id,
                    copiedAt: serverTimestamp()
                };
                delete orderProduct.id; // Remover el ID original
                return addDoc(orderProductsCollection, orderProduct);
            });

            await Promise.all(copyPromises);
            return true;
        } catch (error) {
            console.error('Error al copiar productos al pedido:', error);
            throw error;
        }
    }
}

export const userProductStore = new UserProductStore();