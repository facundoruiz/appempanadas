import { ProductAdminUI } from './admin/productAdmin';
import { userProductManager } from './userProducts';

class OrderView {
    constructor() {
        this.currentOrder = null;
        this.currentUser = null;
        this.productAdmin = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.orderNameElement = document.getElementById('orderName');
        this.creatorNameElement = document.getElementById('creatorName');
        this.btnManageProducts = document.getElementById('btnManageProducts');
        this.productAdminModal = document.getElementById('productAdminModal');
        this.productAdminContainer = document.getElementById('productAdminContainer');
        this.orderProductsContainer = document.getElementById('orderProducts');
    }

    setupEventListeners() {
        // Evento para el botón de administración
        this.btnManageProducts?.addEventListener('click', () => {
            this.showProductAdminModal();
        });

        // Cerrar modal
        const closeBtn = this.productAdminModal?.querySelector('.close');
        closeBtn?.addEventListener('click', () => {
            this.hideProductAdminModal();
        });

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (event) => {
            if (event.target === this.productAdminModal) {
                this.hideProductAdminModal();
            }
        });
    }

    async displayOrder(orderId) {
        try {
            // Obtener datos del pedido
            this.currentOrder = await this.getOrderData(orderId);
            
            // Actualizar información básica
            this.orderNameElement.textContent = this.currentOrder.name;
            this.creatorNameElement.textContent = this.currentOrder.creatorEmail;

            // Verificar si el usuario actual es el creador
            const isCreator = this.currentOrder.createdBy === this.currentUser?.uid;
            
            // Mostrar/ocultar botón de administración
            this.btnManageProducts.style.display = isCreator ? 'inline-block' : 'none';

            // Inicializar administración de productos si es el creador
            if (isCreator) {
                this.initializeProductAdmin(orderId);
            }

            // Cargar y mostrar productos
            await this.loadProducts();

        } catch (error) {
            console.error('Error al mostrar el pedido:', error);
            // Mostrar mensaje de error al usuario
        }
    }

    async loadProducts() {
        try {
            // Obtener productos generales y personalizados
            const generalProducts = await this.getGeneralProducts();
            const customProducts = await userProductManager.getUserProducts(
                this.currentOrder.createdBy,
                this.currentOrder.id
            );

            // Combinar y mostrar todos los productos
            const allProducts = [...generalProducts, ...customProducts];
            this.renderProducts(allProducts);

        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }

    renderProducts(products) {
        const html = products.map(product => `
            <div class="product-item ${product.isCustom ? 'custom-product' : ''}" 
                 data-id="${product.id}">
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">$${product.price}</span>
                </div>
                <div class="product-actions">
                    <button class="btn-add-to-order">Agregar al pedido</button>
                </div>
            </div>
        `).join('');

        this.orderProductsContainer.innerHTML = html;
        this.attachProductEventListeners();
    }

    showProductAdminModal() {
        this.productAdminModal.style.display = 'block';
        // Inicializar o actualizar la interfaz de administración
        if (this.productAdmin) {
            this.productAdmin.initialize(this.currentUser.uid);
        }
    }

    hideProductAdminModal() {
        this.productAdminModal.style.display = 'none';
        // Recargar productos después de cerrar el modal
        this.loadProducts();
    }

    initializeProductAdmin(orderId) {
        if (!this.productAdmin) {
            this.productAdmin = new ProductAdminUI('productAdminContainer', orderId);
            // Escuchar cambios en productos
            this.productAdmin.onProductsChanged = () => {
                this.loadProducts();
            };
        }
    }

    attachProductEventListeners() {
        // Agregar eventos para los botones de "Agregar al pedido"
        const addButtons = this.orderProductsContainer.querySelectorAll('.btn-add-to-order');
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const productItem = e.target.closest('.product-item');
                const productId = productItem.dataset.id;
                this.addProductToOrder(productId);
            });
        });
    }

    async addProductToOrder(productId) {
        // Implementar lógica para agregar producto al pedido actual
        // ... código para agregar al pedido ...
    }
}

export const orderView = new OrderView(); 