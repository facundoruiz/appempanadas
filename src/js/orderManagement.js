class OrderManagement {
    constructor() {
        this.currentUser = null;
        this.currentOrder = null;
        this.adminUI = new ProductAdminUI('productAdminContainer');
    }

    initializeOrder(orderData, currentUser) {
        this.currentUser = currentUser;
        this.currentOrder = orderData;
        
        // Mostrar/ocultar botón de administración
        const btnManageProducts = document.getElementById('btnManageProducts');
        const isCreator = orderData.createdBy === currentUser.uid;
        
        btnManageProducts.style.display = isCreator ? 'block' : 'none';
        
        if (isCreator) {
            this.initializeAdminFeatures();
        }
    }

    initializeAdminFeatures() {
        const btnManageProducts = document.getElementById('btnManageProducts');
        const productAdminModal = document.getElementById('productAdminModal');
        const closeBtn = productAdminModal.querySelector('.close');

        // Inicializar la UI de administración con el usuario actual
        this.adminUI.setUser(this.currentUser.uid);

        // Abrir modal de administración
        btnManageProducts.addEventListener('click', () => {
            productAdminModal.style.display = 'block';
        });

        // Cerrar modal
        closeBtn.addEventListener('click', () => {
            productAdminModal.style.display = 'none';
        });

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (event) => {
            if (event.target === productAdminModal) {
                productAdminModal.style.display = 'none';
            }
        });
    }
}

export const orderManagement = new OrderManagement(); 