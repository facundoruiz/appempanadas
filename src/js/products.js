// Clase para manejar los productos
export class ProductManager {
    constructor() {
        this.products = [
            { id: 'emp-carne', name: 'Empanada de Carne', price: 100, active: true },
            { id: 'emp-pollo', name: 'Empanada de Pollo', price: 100, active: true },
            { id: 'emp-mondongo', name: 'Empanada de Mondongo', price: 100, active: true },
            { id: 'sfija', name: 'Sfija', price: 120, active: true },
            { id: 'canasta', name: 'Canasta', price: 150, active: true }
        ];
    }

    // Crear nuevo producto
    addProduct(name, price) {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const newProduct = {
            id,
            name,
            price,
            active: true
        };
        this.products.push(newProduct);
        return newProduct;
    }

    // Obtener todos los productos activos
    getProducts() {
        return this.products.filter(product => product.active);
    }

    // Actualizar producto
    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            return this.products[index];
        }
        return null;
    }

    // Eliminar producto (desactivar)
    deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index].active = false;
            return true;
        }
        return false;
    }
}

export const productManager = new ProductManager();
