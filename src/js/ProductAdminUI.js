import { userProductStore } from './userProductStore';

export class ProductAdminUI {
    constructor(containerId, orderId) {
        this.container = document.getElementById(containerId);
        this.orderId = orderId;
        this.userId = null;
        this.onProductsChanged = null;
    }

    async initialize(userId) {
        this.userId = userId;
        this.setupEventListeners();
        await this.renderUserProducts();
        
        // Copiar productos del usuario al pedido actual
        await userProductStore.copyUserProductsToOrder(userId, this.orderId);
    }

    setupEventListeners() {
        const form = document.getElementById('addCustomProductForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAddProduct();
            });
        }
    }

    async handleAddProduct() {
        try {
            const nameInput = document.getElementById('newProductName');
            const priceInput = document.getElementById('newProductPrice');
            
            const productData = {
                name: nameInput.value.trim(),
                price: Number(priceInput.value)
            };

            // Agregar producto a la tienda del usuario
            await userProductStore.addUserProduct(this.userId, productData);
            
            // Copiar productos actualizados al pedido
            await userProductStore.copyUserProductsToOrder(this.userId, this.orderId);
            
            // Limpiar formulario
            nameInput.value = '';
            priceInput.value = '';
            
            // Actualizar vista
            await this.renderUserProducts();
            
            if (this.onProductsChanged) {
                this.onProductsChanged();
            }
        } catch (error) {
            console.error('Error al agregar producto:', error);
            alert('Error al agregar el producto');
        }
    }

    async renderUserProducts() {
        try {
            const products = await userProductStore.getUserProducts(this.userId);
            const customProductsList = document.getElementById('customProductsList');
            
            if (!customProductsList) return;

            customProductsList.innerHTML = products.map(product => `
                <div class="custom-product-item" data-id="${product.id}">
                    <span>${product.name} - $${product.price}</span>
                    <div class="product-actions">
                        <button class="btn-edit" data-id="${product.id}">✏️</button>
                        <button class="btn-delete" data-id="${product.id}">🗑️</button>
                    </div>
                </div>
            `).join('');

            this.attachProductEventListeners();
        } catch (error) {
            console.error('Error al renderizar productos:', error);
            customProductsList.innerHTML = '<p class="error">Error al cargar los productos</p>';
        }
    }

    attachProductEventListeners() {
        const customProductsList = document.getElementById('customProductsList');
        if (!customProductsList) return;

        customProductsList.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                const newPrice = prompt('Ingrese el nuevo precio:');
                if (newPrice && !isNaN(newPrice)) {
                    try {
                        await userProductStore.updateUserProduct(productId, {
                            price: Number(newPrice)
                        });
                        await userProductStore.copyUserProductsToOrder(this.userId, this.orderId);
                        await this.renderUserProducts();
                        if (this.onProductsChanged) {
                            this.onProductsChanged();
                        }
                    } catch (error) {
                        console.error('Error al actualizar producto:', error);
                        alert('Error al actualizar el producto');
                    }
                }
            });
        });

        customProductsList.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                if (confirm('¿Está seguro de eliminar este producto?')) {
                    try {
                        await userProductStore.deleteUserProduct(productId);
                        await userProductStore.copyUserProductsToOrder(this.userId, this.orderId);
                        await this.renderUserProducts();
                        if (this.onProductsChanged) {
                            this.onProductsChanged();
                        }
                    } catch (error) {
                        console.error('Error al eliminar producto:', error);
                        alert('Error al eliminar el producto');
                    }
                }
            });
        });
    }
}
