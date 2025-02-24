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
        // Primero, obtener los pedidos creados por el usuario
        const createdOrdersQuery = query(
            collection(db, 'orders'),
            where('status', '==', 'active'),
            where('createdBy', '==', userId)
        );

        let createdOrders = [];
        const unsubscribeCreated = onSnapshot(createdOrdersQuery, (snapshot) => {
            createdOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Combinar y enviar todos los pedidos
            combineAndSendOrders();
        });

        // Luego, obtener los pedidos compartidos con el usuario
        const sharedOrdersQuery = query(
            collection(db, 'users'),
            where('__name__', '==', userId)
        );

        let sharedOrders = [];
        const unsubscribeShared = onSnapshot(sharedOrdersQuery, (snapshot) => {
            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                const sharedOrderIds = userData.sharedOrders || [];

                // Si no hay pedidos compartidos, enviar solo los pedidos creados
                if (sharedOrderIds.length === 0) {
                    sharedOrders = [];
                    combineAndSendOrders();
                    return;
                }

                // Obtener los documentos de los pedidos compartidos
                Promise.all(sharedOrderIds.map(orderId => 
                    getDoc(doc(db, 'orders', orderId))
                )).then(orderDocs => {
                    sharedOrders = orderDocs
                        .filter(doc => doc.exists())
                        .map(doc => ({ id: doc.id, ...doc.data() }));
                    combineAndSendOrders();
                });
            } else {
                sharedOrders = [];
                combineAndSendOrders();
            }
        });

        // Función para combinar y enviar los pedidos
        function combineAndSendOrders() {
            const allOrders = [...createdOrders, ...sharedOrders];
            callback(allOrders);
        }

        // Devolver una función para dejar de escuchar ambos streams
        return () => {
            unsubscribeCreated();
            unsubscribeShared();
        };
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

            // Validar que items sea un array y que cada item tenga precio y cantidad
            if (!Array.isArray(items) || !items.every(item => item.price !== undefined && item.quantity !== undefined)) {
                throw new Error('Items inválidos: deben ser un array de objetos con precio y cantidad');
            }

            const updates = {
                [`items.${userId}`]: items,
                updatedAt: serverTimestamp()
            };

            try {
                await updateDoc(orderRef, updates);
                await this.updateOrderTotal(orderId);
            } catch (error) {
                console.error('Error al actualizar el documento del pedido:', error);
                throw new Error('Error al agregar items al pedido en Firestore');
            }
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
