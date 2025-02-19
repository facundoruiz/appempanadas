import { db, auth } from './firebase';
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    onSnapshot,
    query,
    where,
    serverTimestamp 
} from 'firebase/firestore';

export class OrderManager {
    constructor() {
        this.currentOrderId = null;
        this.listeners = new Map();
    }

    // Crear nuevo pedido
    async createOrder(userId, orderName = '') {
        try {
            // Verificamos que el usuario esté autenticado
            if (!auth.currentUser) {
                throw new Error('Usuario no autenticado');
            }

            const orderRef = await addDoc(collection(db, 'orders'), {
                createdBy: userId,
                creatorEmail: auth.currentUser.email,
                name: orderName || `Pedido ${new Date().toLocaleDateString()}`,
                createdAt: serverTimestamp(),
                status: 'active',
                items: {},
                totalAmount: 0
            });
            
            this.currentOrderId = orderRef.id;
            return orderRef.id;
        } catch (error) {
            console.error('Error al crear pedido:', error);
            throw error;
        }
    }

    // Obtener un pedido específico
    async getOrder(orderId) {
        try {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            
            if (!orderDoc.exists()) {
                return null;
            }
            
            return orderDoc.data();
        } catch (error) {
            console.error('Error al obtener pedido:', error);
            throw error;
        }
    }

    // Escuchar cambios en un pedido
    listenToOrder(orderId, callback) {
        if (this.listeners.has(orderId)) {
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'orders', orderId),
            (doc) => {
                if (doc.exists()) {
                    const orderData = doc.data();
                    // Actualizar la UI con los datos del pedido
                    callback(orderData);
                }
            },
            (error) => {
                console.error('Error al escuchar pedido:', error);
            }
        );

        this.listeners.set(orderId, unsubscribe);
    }

    // Obtener pedidos activos del usuario
    listenToUserOrders(userId, callback) {
        const q = query(
            collection(db, 'orders'),
            where('status', '==', 'active'),
            where('createdBy', '==', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            callback(orders);
        });
    }

    // Dejar de escuchar cambios
    stopListening(orderId) {
        const unsubscribe = this.listeners.get(orderId);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(orderId);
        }
    }

    // Agregar items al pedido
    async addItemsToOrder(orderId, userId, items) {
        try {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            
            if (!orderDoc.exists()) {
                throw new Error('El pedido no existe');
            }

            const updates = {
                [`items.${userId}`]: items,
                updatedAt: serverTimestamp()
            };

            await updateDoc(orderRef, updates);
            await this.updateOrderTotal(orderId);
        } catch (error) {
            console.error('Error al agregar items:', error);
            throw error;
        }
    }

    // Actualizar total del pedido
    async updateOrderTotal(orderId) {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderDoc.data();
        let total = 0;

        Object.values(orderData.items).forEach(userItems => {
            userItems.forEach(item => {
                total += item.price * item.quantity;
            });
        });

        await updateDoc(doc(db, 'orders', orderId), {
            totalAmount: total
        });
    }

    async closeOrder(orderId) {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: 'closed',
                closedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error al cerrar pedido:', error);
            throw error;
        }
    }

    async duplicateOrder(orderId) {
        try {
            const originalOrder = await this.getOrder(orderId);
            const newOrderData = {
                ...originalOrder,
                createdAt: serverTimestamp(),
                items: {},
                status: 'active',
                name: `${originalOrder.name} (Copia)`
            };
            
            const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData);
            return newOrderRef.id;
        } catch (error) {
            console.error('Error al duplicar pedido:', error);
            throw error;
        }
    }
}
