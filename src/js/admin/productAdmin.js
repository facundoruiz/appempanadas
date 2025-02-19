import { userProductManager } from '../userProducts';

export class ProductAdminUI {
    constructor(containerId, orderId) {
        this.container = document.getElementById(containerId);
        this.orderId = orderId;
        this.userId = null;
        this.onProductsChanged = null; // Callback para cuando los productos cambien
    }

    async initialize(userId) {
        this.userId = userId;
        this.setupEventListeners();
        await this.renderCustomProducts();
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

            await userProductManager.addUserProduct(this.userId, this.orderId, productData);
            
            // Limpiar el formulario
            nameInput.value = '';
            priceInput.value = '';
            
            // Actualizar la lista de productos
            await this.renderCustomProducts();
            
            // Notificar el cambio
            if (this.onProductsChanged) {
                this.onProductsChanged();
            }
        } catch (error) {
            console.error('Error al agregar producto:', error);
            alert('Error al agregar el producto');
        }
    }

    async renderCustomProducts() {
        try {
            const products = await userProductManager.getUserProducts(this.userId, this.orderId);
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

            // Agregar event listeners para editar y eliminar
            this.attachProductEventListeners();
        } catch (error) {
            console.error('Error al renderizar productos:', error);
            customProductsList.innerHTML = '<p class="error">Error al cargar los productos</p>';
        }
    }

    attachProductEventListeners() {
        const customProductsList = document.getElementById('customProductsList');
        if (!customProductsList) return;

        // Event listeners para botones de editar
        customProductsList.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                const newPrice = prompt('Ingrese el nuevo precio:');
                if (newPrice && !isNaN(newPrice)) {
                    try {
                        await userProductManager.updateUserProduct(productId, {
                            price: Number(newPrice)
                        });
                        await this.renderCustomProducts();
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

        // Event listeners para botones de eliminar
        customProductsList.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                if (confirm('¿Está seguro de eliminar este producto?')) {
                    try {
                        await userProductManager.deleteUserProduct(productId);
                        await this.renderCustomProducts();
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