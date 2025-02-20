import { db, auth } from './firebase';
import { 
    doc, 
    setDoc, 
    getDoc, 
    query, 
    where, 
    getDocs, 
    collection 
} from 'firebase/firestore';

// Clase para manejar los productos
export class ProductManager {
    constructor() {
        this.products = []; // Inicializar el array de productos
       
    }
     
    // Crear nuevo producto
    async addProduct(name, price, orderId) {
        const user = auth.currentUser; // Obtener el usuario logueado
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const newProduct = {
            id,
            name,
            price,
            active: true
        };
        this.products.push(newProduct);
        await this.saveProductToFirebase(newProduct, orderId); // Guardar en Firebase
        return newProduct;
    }

    // Método para verificar si el usuario es el creador del pedido
    async isUserCreator(userId) {
        const userRef = doc(db, 'creators', userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists(); // Retorna true si el usuario es el creador
    }

 
    
     // Función para obtener productos de Firebase
     async fetchProductsFromFirebase() {
        try {
            const productsCollection = collection(db, 'products');
            const querySnapshot = await getDocs(productsCollection);
            this.products = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return this.products;
        } catch (error) {
            console.error("Error fetching products:", error);
            throw error; // Relanzar el error para manejo externo
        }
    }

    // Guardar producto en Firebase
    async saveProductToFirebase(product, orderId) {
        const productRef = doc(db, 'orders', orderId, 'products', product.id);
        await setDoc(productRef, product);
    }

    // Obtener todos los productos activos
    getProducts() {
        return this.products.filter(product => product.active);
    }

    // Actualizar producto
    async updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            const productRef = doc(db, 'products', id);
            await setDoc(productRef, this.products[index]); // Actualizar en Firebase
            return this.products[index];
        }
        return null;
    }

    // Eliminar producto (desactivar)
    async deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index].active = false;
            const productRef = doc(db, 'products', id);
            await setDoc(productRef, { active: false }, { merge: true }); // Desactivar en Firebase
            return true;
        }
        return false;
    }
}


