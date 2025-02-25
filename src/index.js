
import 'bootstrap/dist/css/bootstrap.min.css';
import '@popperjs/core';
import 'bootstrap';

import { auth, db } from './js/firebase';

import { loginWithGoogle,loginWithEmail,logout } from "./js/auth";

import { OrderManager } from './js/orders';
import { ProductManager } from './js/products';

// Variables globales
const orderManager = new OrderManager();
let currentUser = null;
let currentOrderId = null;
let hasUnsavedChanges = false;
let currentOrderData = null;

// Productos disponibles
const productManager = new ProductManager();

/* { active: true, id: 'emp-carne', name: 'Empanada de Carne', price: 100 },
{ id: 'emp-pollo', name: 'Empanada de Pollo', price: 100 },
{ id: 'emp-mondongo', name: 'Empanada de Mondongo', price: 100 },
{ id: 'sfija', name: 'Sfija', price: 120 },
{ id: 'canasta', name: 'Canasta', price: 150 } */

    let PRODUCTS = [];
    
  try {
    
      const loadProducts = async () => {
          PRODUCTS = await productManager.fetchProductsFromFirebase();
      };
      
      // Cargar productos sin bloquear la ejecución
      (async () => {
          await loadProducts();
      })().catch(error => {
          console.error("Error cargando productos:", error);
          PRODUCTS = []; // Asignar array vacío como fallback
      });
        
    } catch (error) {
        alert(error.message || 'Error al cargar Productos');
    }
   
// Definir showOrderView en el ámbito global
window.showOrderView = async function(orderId) {
    try {
        const productSection = document.getElementById('productSection');
        const ordersSection = document.getElementById('ordersSection');

        if (!productSection || !ordersSection) {
            throw new Error('Elementos no encontrados');
        }

        // Guardar el ID del pedido actual
        currentOrderId = orderId;

        // Obtener datos del pedido
        const orderDoc = await orderManager.getOrder(orderId);
        if (!orderDoc) {
            throw new Error('Pedido no encontrado');
        }

        // Ocultar sección de pedidos y mostrar sección de productos
        ordersSection.style.display = 'none';
        productSection.style.display = 'block';

        // Actualizar link para compartir
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.value = `${window.location.origin}?order=${orderId}`;
        }

        // Escuchar cambios en el pedido
        orderManager.listenToOrder(orderId, (orderData) => {
            updateOrderView(orderData);
        });

        // Mostrar productos disponibles
        showProducts();
    } catch (error) {
        console.error('Error al mostrar vista del pedido:', error);
        alert(error.message || 'Error al cargar la vista del pedido');
    }
};



// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login con email
    document.getElementById('btnLoginEmail')?.addEventListener('click', async () => {
        const email = document.getElementById('emailInput')?.value;
        const password = document.getElementById('passwordInput')?.value;
        
        if (!email || !password) {
            alert('Por favor, completa todos los campos');
            return;
        }
        
        try {
            currentUser = await loginWithEmail(email, password);
        } catch (error) {
            console.error('Error en el proceso de login:', error);
        }
    });

    // Login con Google
    document.getElementById('btnLoginGoogle')?.addEventListener('click', async () => {
        try {
            currentUser = await loginWithGoogle();
        } catch (error) {
            console.error('Error en el proceso de login con Google:', error);
        }
    });

     // Login anónimo
     document.getElementById('btnLoginAnonymous')?.addEventListener('click', async () => {
        try {
            currentUser = await loginAnonymously();
        } catch (error) {
            console.error('Error en el proceso de login anónimo:', error);
        }
    });

    // Crear pedido
    document.getElementById('btnCreateOrder')?.addEventListener('click', async () => {
        try {
            const orderName = document.getElementById('orderName')?.value.trim() || '';
            const orderId = await orderManager.createOrder(currentUser.uid, orderName);
            currentOrderId = orderId; // Guardar el ID del pedido actual
            showOrderView(orderId);
        } catch (error) {
            console.error('Error al crear pedido:', error);
            alert('Error al crear el pedido');
        }
    });

    // Verificar el estado de autenticación
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            // Inicializar vista de pedidos
            const mainSection = document.getElementById('mainSection');
            const loginSection = document.getElementById('loginSection');
            
            if (mainSection && loginSection) {
                loginSection.style.display = 'none';
                mainSection.style.display = 'block';
            }

            // Mostrar el nombre del usuario
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || user.email;
            }

            // Escuchar pedidos activos del usuario
            orderManager.listenToUserOrders(user.uid, (orders) => {
                displayActiveOrders(orders);
            });

            // Verificar si hay un orderId en la URL
            verificarOrderIdEnURL();
          

        } else {
            const mainSection = document.getElementById('mainSection');
            const loginSection = document.getElementById('loginSection');
            if (mainSection && loginSection) {
                mainSection.style.display = 'none';
                loginSection.style.display = 'block';
            }
        }
    });
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
        try {
            await logout(); 
            window.location.reload();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión');
        }
    });

    // Event listener para guardar productos en el pedido
    document.getElementById('btnSaveOrder')?.addEventListener('click', async () => {
        try {
            toggleLoading(true, 'btnSaveOrder');
            if (!currentUser) {
                throw new Error('Usuario no autenticado');
            }

            if (!currentOrderId) {
                throw new Error('No hay un pedido activo');
            }

            const items = [];
            const productInputs = document.querySelectorAll('#productList input[type="number"]');
            
            productInputs.forEach(input => {
                const quantity = parseInt(input.value);
                if (quantity > 0) {
                    const product = PRODUCTS.find(p => p.id === input.id);
                    items.push({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: quantity,
                        userEmail: currentUser.email
                    });
                }
            });

            if (items.length === 0) {
                alert('Por favor, selecciona al menos un producto');
                return;
            }

            await orderManager.addItemsToOrder(currentOrderId, currentUser.uid, items);
            alert('Pedido guardado exitosamente');

            // Limpiar los inputs después de guardar
            productInputs.forEach(input => input.value = '0');
        } catch (error) {
            console.error('Error al guardar pedido:', error);
            alert(error.message || 'Error al guardar el pedido');
        } finally {
            toggleLoading(false, 'btnSaveOrder');
        }
    });

    // Función para verificar si hay un orderId en la URL al cargar
    function verificarOrderIdEnURL() {
        const pathArray = window.location.pathname.split('/');
        const currentPage = pathArray[pathArray.length - 1];
        const params = new URLSearchParams(window.location.search);
        const sharedOrderId = params.get('order');
        
        if (sharedOrderId) {
            currentOrderId = sharedOrderId;
            // Agregar el pedido a la lista de pedidos compartidos del usuario
            addSharedOrderToUser(sharedOrderId);
            if (currentPage === 'pedido.html') {
                showOrderView(currentOrderId)
            } else  
            window.location.href = `pedido.html?order=${currentOrderId}`;
        }
        
    }
   
    async function addSharedOrderToUser(orderId) {
        if (!currentUser) {
            console.error('Usuario no autenticado');
            return;
        }
    
        try {
            const userRef = db.collection('users').doc(currentUser.uid);
            const userDoc = await userRef.get();
    
            if (!userDoc.exists) {
                // Si el documento del usuario no existe, créalo
                await userRef.set({ sharedOrders: [orderId] });
            } else {
                const userData = userDoc.data();
                let sharedOrders = userData.sharedOrders || [];
    
                // Verificar si el pedido ya está en la lista
                if (!sharedOrders.includes(orderId)) {
                    sharedOrders.push(orderId);
                    await userRef.update({ sharedOrders: sharedOrders });
                }
            }
        } catch (error) {
            console.error('Error al agregar pedido compartido:', error);
        }
    }

    // Modal y botones de resumen
    const modal = document.getElementById('summaryModal');
    const btnShowTotalSummary = document.getElementById('btnShowTotalSummary');
    const btnCopySummary = document.getElementById('btnCopySummary');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    // Actualizar la función updateOrderView para guardar los datos actuales
    const originalUpdateOrderView = updateOrderView;
    updateOrderView = function(orderData) {
        currentOrderData = orderData;
        originalUpdateOrderView(orderData);
    };

    // Función para abrir el modal
    function openModal(orderData) {
        const modal = document.getElementById('summaryModal');
        const totalSummary = document.getElementById('totalSummary');
        const summaryText = generateTotalSummary(orderData);
        
        totalSummary.textContent = summaryText;
        modal.classList.add('active');
        
        // Scroll al inicio del modal
        totalSummary.scrollTop = 0;
        
        // Deshabilitar scroll del body
        document.body.style.overflow = 'hidden';
    }

    // Función para cerrar el modal
    function closeModal() {
        const modal = document.getElementById('summaryModal');
        modal.classList.remove('active');
        
        // Rehabilitar scroll del body
        document.body.style.overflow = 'auto';
    }

    // Botón para copiar resumen simple
    document.getElementById('btnCopySummary')?.addEventListener('click', () => {
        if (!currentOrderData) {
            alert('No hay datos del pedido disponibles');
            return;
        }

        const summaryText = generateSimpleSummary(currentOrderData);
        navigator.clipboard.writeText(summaryText)
            .then(() => {
                showCopyNotification();
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                alert('Error al copiar al portapapeles');
            });
    });

    // Botón para mostrar resumen detallado
    document.getElementById('btnShowTotalSummary')?.addEventListener('click', () => {
        if (!currentOrderData) {
            alert('No hay datos del pedido disponibles');
            return;
        }
        
        const totalSummary = document.getElementById('totalSummary');
        totalSummary.textContent = generateTotalSummary(currentOrderData);
        openModal(currentOrderData);
    });

    // Cerrar modal con el botón X
    closeBtn?.addEventListener('click', () => {
        closeModal();
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Cerrar modal con la tecla ESC
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Botón para copiar resumen con precios
    document.getElementById('btnCopyPriceSummary')?.addEventListener('click', () => {
        if (!currentOrderData) {
            alert('No hay datos del pedido disponibles');
            return;
        }

        const summaryText = generatePriceSummary(currentOrderData);
        navigator.clipboard.writeText(summaryText)
            .then(() => {
                showCopyNotification();
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                alert('Error al copiar al portapapeles');
            });
    });

    document.getElementById('btnManageProducts')?.addEventListener('click', () => {
        const modal = document.getElementById('productAdminModal');
        if (modal) {
            modal.style.display = 'block';
        }
    });

    // Manejar el envío del formulario para agregar productos
    document.getElementById('addCustomProductForm')?.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        const productName = document.getElementById('newProductName').value.trim();
        const productPrice = parseFloat(document.getElementById('newProductPrice').value);
        const orderId = currentOrderId; // Obtener el orderId actual

        if (!productName || isNaN(productPrice) || productPrice <= 0) {
            alert('Por favor, completa todos los campos correctamente.');
            return;
        }

        try {
            const newProduct = await productManager.addProduct(productName, productPrice,orderId);
            if (newProduct) {
                alert('Producto agregado exitosamente');
                // Limpiar el formulario
                document.getElementById('newProductName').value = '';
                document.getElementById('newProductPrice').value = '';
                // Opcional: actualizar la lista de productos personalizados
                displayCustomProducts();
            } else {
                alert('No tienes permiso para agregar productos.');
            }
        } catch (error) {
            console.error('Error al agregar producto:', error);
            alert('Error al agregar el producto');
        }
    });

    // Event listener para cerrar pedido
    document.getElementById('activeOrdersList')?.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-close-order')) {
            const orderId = event.target.dataset.orderId;
            try {
                await orderManager.closeOrder(orderId);
                alert('Pedido cerrado exitosamente');
                // Recargar la lista de pedidos activos
                orderManager.listenToUserOrders(currentUser.uid, (orders) => {
                    displayActiveOrders(orders);
                });
            } catch (error) {
                console.error('Error al cerrar pedido:', error);
                alert('Error al cerrar el pedido');
            }
        }
    });
});

// Cerrar modal de administración de productos
document.querySelector('#productAdminModal .close')?.addEventListener('click', () => {
    const modal = document.getElementById('productAdminModal');
    if (modal) {
        modal.style.display = 'none';
    }
});

// Función para mostrar productos
function showProducts() {
    const productSection = document.getElementById('productSection');
    const productList = document.getElementById('productList');
    
    if (!productSection || !productList) {
        console.error('Elementos de productos no encontrados');
        return;
    }

    productSection.style.display = 'block';
    productList.innerHTML = '';

  
    PRODUCTS.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <span>${product.name} - $${product.price}</span>
            <input type="number" min="0" value="0" id="${product.id}">
        `;
        productList.appendChild(div);
    });
}



// Función para mostrar pedidos activos
function displayActiveOrders(orders) {
    const activeOrdersList = document.getElementById('activeOrdersList');
    if (!activeOrdersList) return;

    activeOrdersList.innerHTML = '';
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.innerHTML = `
            <div>
                <h4>${order.name || 'Pedido sin nombre'}</h4>
                <p>Creado: ${order.createdAt?.toDate().toLocaleString()}</p>
            </div>
            <!-- <button onclick="showOrderView('${order.id}')">Ver Pedido</button> -->
            <a href="pedido.html?order=${order.id}" >Ver Pedido</a>
            ${order.createdBy === auth.currentUser?.uid ? `<button class="btn-close-order" data-order-id="${order.id}">Cerrar Pedido</button>` : ''}
        `;
        activeOrdersList.appendChild(orderElement);
    });
}

// Actualizar vista del pedido
function updateOrderView(orderData) {
    currentOrderData = orderData;
    
    const orderDetails = document.getElementById('orderDetails');
    const totalAmount = document.getElementById('totalAmount');
    const orderCreator = document.getElementById('orderCreator');
    const currentOrderName = document.getElementById('currentOrderName');

    if (!orderDetails || !totalAmount || !orderCreator || !currentOrderName) return;

    if (orderData) {
        currentOrderName.textContent = orderData.name || 'Pedido sin nombre';
        orderCreator.textContent = orderData.creatorEmail;

        let detailsHTML = '';
        let total = 0;

        // Mostrar items por usuario
        Object.entries(orderData.items || {}).forEach(([userId, userItems]) => {
            const isCurrentUser = userId === auth.currentUser?.uid;
            detailsHTML += `
                <div class="user-order">
                    <h5>${isCurrentUser ? 'Tus productos' : `Usuario: ${userItems[0]?.userEmail || userId}`}</h5>
                    ${userItems.map(item => {
                        const itemTotal = item.quantity * item.price;
                        total += itemTotal;
                        return `
                            <p>${item.name}: ${item.quantity} x $${item.price} = $${itemTotal}</p>
                        `;
                    }).join('')}
                </div>
            `;
        });

        orderDetails.innerHTML = detailsHTML;
        totalAmount.textContent = `Total del pedido: $${total}`;
    }
}

// Agregar un botón para volver a la lista de pedidos
document.getElementById('btnBackToOrders')?.addEventListener('click', () => {
    const productSection = document.getElementById('productSection');
    const ordersSection = document.getElementById('ordersSection');

    if (productSection && ordersSection) {
        productSection.style.display = 'none';
        ordersSection.style.display = 'block';
    }

    // Limpiar el ID del pedido actual
    currentOrderId = null;
});

// Función para generar el resumen total
function generateTotalSummary(orderData) {
    if (!orderData || !orderData.items) {
        return 'No hay productos en el pedido';
    }

    // Objeto para almacenar totales por producto
    const productTotals = {};
    let totalAmount = 0;

    // Sumar cantidades por producto
    Object.values(orderData.items).forEach(userItems => {
        userItems.forEach(item => {
            if (!productTotals[item.name]) {
                productTotals[item.name] = {
                    quantity: 0,
                    price: item.price
                };
            }
            productTotals[item.name].quantity += item.quantity;
            totalAmount += item.quantity * item.price;
        });
    });

    // Generar texto del resumen
    let summaryText = '📋 RESUMEN DEL PEDIDO\n';
    summaryText += '====================\n\n';
    
    // Agregar productos y cantidades
    Object.entries(productTotals).forEach(([name, data]) => {
        summaryText += `${name}: ${data.quantity} x $${data.price} = $${data.quantity * data.price}\n`;
    });
    
    summaryText += '\n====================\n';
    summaryText += `TOTAL: $${totalAmount}\n`;
    summaryText += '====================\n\n';

    // Agregar detalle por usuario
    summaryText += '👥 DETALLE POR USUARIO\n';
    summaryText += '====================\n\n';
    
    Object.entries(orderData.items).forEach(([userId, userItems]) => {
        const userEmail = userItems[0]?.userEmail || userId;
        let userTotal = 0;
        
        summaryText += `${userEmail}:\n`;
        userItems.forEach(item => {
            const itemTotal = item.quantity * item.price;
            userTotal += itemTotal;
            summaryText += `  - ${item.name}: ${item.quantity} x $${item.price} = $${itemTotal}\n`;
        });
        summaryText += `  Subtotal: $${userTotal}\n\n`;
    });

    return summaryText;
}

// Función para mostrar notificación de copiado
function showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-success';
    notification.textContent = '¡Copiado al portapapeles!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para mostrar/ocultar estado de cargando
function toggleLoading(show, buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = show;
        button.innerHTML = show ? 
            '<span class="spinner"></span> Procesando...' : 
            button.getAttribute('data-original-text');
    }
}

window.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '¿Seguro que quieres salir? Hay cambios sin guardar.';
    }
});

function validateQuantity(input) {
    const MAX_QUANTITY = 50;
    const value = parseInt(input.value);
    
    if (value > MAX_QUANTITY) {
        alert(`La cantidad máxima permitida es ${MAX_QUANTITY}`);
        input.value = MAX_QUANTITY;
    }
    
    if (value < 0) {
        input.value = 0;
    }
}

// Agregar a los inputs de cantidad
document.querySelectorAll('#productList input[type="number"]').forEach(input => {
    input.addEventListener('change', () => validateQuantity(input));
});

function shareViaWhatsApp(orderData) {
    const summaryText = generateTotalSummary(orderData);
    const encodedText = encodeURIComponent(summaryText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
}

// Agregar botón en el HTML
`<button id="btnShareWhatsApp" class="share-button">
    Compartir por WhatsApp
</button>`

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Actualización de Pedido', {
            body: message,
            icon: '/icon.png'
        });
    }
}

// Solicitar permiso para notificaciones
async function requestNotificationPermission() {
    if ('Notification' in window) {
        await Notification.requestPermission();
    }
}

function startOrderTimer(createdAt) {
    const timerElement = document.getElementById('orderTimer');
    
    setInterval(() => {
        const now = new Date();
        const created = createdAt.toDate();
        const diff = Math.floor((now - created) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        
        timerElement.textContent = `Tiempo activo: ${hours}h ${minutes}m`;
    }, 1000);
}

// Función para generar el resumen simplificado (solo para copiar)
function generateSimpleSummary(orderData) {
    if (!orderData || !orderData.items) {
        return 'No hay productos en el pedido';
    }

    const productTotals = {};
    
    Object.values(orderData.items).forEach(userItems => {
        userItems.forEach(item => {
            if (!productTotals[item.name]) {
                productTotals[item.name] = 0;
            }
            productTotals[item.name] += item.quantity;
        });
    });

    let summaryText = '🥟 PEDIDO:\n\n';
    
    Object.entries(productTotals)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, quantity]) => {
            summaryText += `${quantity} × ${name}\n`;
        });

    return summaryText;
}

// Función para generar resumen con precios
function generatePriceSummary(orderData) {
    if (!orderData || !orderData.items) {
        return 'No hay productos en el pedido';
    }

    const productTotals = {};
    let totalAmount = 0;
    
    Object.values(orderData.items).forEach(userItems => {
        userItems.forEach(item => {
            if (!productTotals[item.name]) {
                productTotals[item.name] = {
                    quantity: 0,
                    price: item.price
                };
            }
            productTotals[item.name].quantity += item.quantity;
            totalAmount += item.quantity * item.price;
        });
    });

    let summaryText = '🥟 PEDIDO:\n\n';
    
    Object.entries(productTotals)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .forEach(([name, data]) => {
            const subtotal = data.quantity * data.price;
            summaryText += `${data.quantity} × ${name} = $${subtotal}\n`;
        });

    summaryText += '\nTotal: $' + totalAmount;
    
    return summaryText;
}

// Función para mostrar productos personalizados
async function displayCustomProducts() {
    const customProductsList = document.getElementById('customProductsList');
    customProductsList.innerHTML = ''; // Limpiar la lista

    const products = await productManager.getProducts(); // Obtener productos activos
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.textContent = `${product.name} - $${product.price}`;
        customProductsList.appendChild(productDiv);
    });
}
