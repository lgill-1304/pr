let currentRecipe = null;

function agregarIngrediente() {
    const input = document.getElementById('ingrediente');
    const ingrediente = input.value.trim();
    
    if (ingrediente) {
        const lista = document.getElementById('lista-ingredientes');
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center animate__animated animate__fadeInLeft';
        li.innerHTML = `
            ${ingrediente}
        `;
        lista.appendChild(li);
        input.value = '';
    }
}

function obtenerIngredientes() {
    return Array.from(document.getElementById('lista-ingredientes').children)
        .map(li => li.textContent.trim());
}

async function mostrarRecetasGuardadas() {
    try {
        // Mostrar loading
        const loadingModal = Swal.fire({
            title: 'Cargando recetas...',
            html: '<i class="fas fa-spinner fa-spin"></i>',
            allowOutsideClick: false,
            showConfirmButton: false
        });

        const response = await fetch('/obtener_recetas');
        const data = await response.json();

        // Cerrar loading
        await loadingModal.close();

        if (data.success) {
            const container = document.getElementById('lista-recetas-guardadas');
            
            if (!data.recetas || data.recetas.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">No hay recetas guardadas</p>
                        <button class="btn btn-primary" data-bs-dismiss="modal">
                            <i class="fas fa-plus"></i> Crear nueva receta
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = data.recetas.map(receta => {
                const recetaJSON = JSON.stringify(receta).replace(/'/g, "&#39;");
                return `
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${receta.nombre || 'Receta sin nombre'}</h5>
                                <p class="card-text">
                                    <small class="text-muted">
                                        <i class="far fa-clock"></i> ${receta.tiempo_preparacion || 'N/A'} | 
                                        <i class="fas fa-signal"></i> ${receta.dificultad || 'N/A'}
                                    </small>
                                </p>
                                <div class="d-flex justify-content-center">
                                    <button class="btn btn-primary btn-sm" onclick='verReceta(${recetaJSON})'>
                                        <i class="fas fa-eye"></i> Ver receta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('recetasGuardadasModal'));
            modal.show();
        } else {
            throw new Error(data.error || 'Error al cargar las recetas');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las recetas guardadas'
        });
    }
}

async function generarReceta() {
    try {
        const ingredientes = obtenerIngredientes();
        if (ingredientes.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: '¡Ups!',
                text: 'Por favor, agrega al menos un ingrediente'
            });
            return;
        }

        // Mostrar loading con mensaje optimista
        const loadingMessages = [
            'Consultando al chef mágico... ',
            'Mezclando ingredientes... ',
            'Añadiendo un toque de magia... ',
            'Probando el sabor... '
        ];
        let messageIndex = 0;
        const loadingElement = document.getElementById('loading');
        
        // Iniciar animación de carga
        loadingElement.classList.remove('d-none');
        document.getElementById('resultado-receta').classList.remove('d-none');
        
        // Rotar mensajes de carga
        const messageInterval = setInterval(() => {
            loadingElement.innerHTML = `
                <div class="text-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Generando...</span>
                    </div>
                    <p class="mt-2">${loadingMessages[messageIndex]}</p>
                </div>
            `;
            messageIndex = (messageIndex + 1) % loadingMessages.length;
        }, 2000);

        // Hacer la petición
        const response = await fetch('/generar_receta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ingredientes: ingredientes,
                preferencias: document.getElementById('preferencias').value
            })
        });

        // Limpiar intervalo de mensajes
        clearInterval(messageInterval);

        const data = await response.json();
        if (data.success) {
            currentRecipe = data.receta;
            mostrarReceta(data.receta);
            
            // Limpiar ingredientes después de generar
            document.getElementById('lista-ingredientes').innerHTML = '';
            document.getElementById('ingrediente').value = '';
            document.getElementById('preferencias').value = '';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: 'Hubo un error al generar la receta'
        });
    } finally {
        document.getElementById('loading').classList.add('d-none');
    }
}

function verReceta(receta) {
    try {
        if (!receta) {
            throw new Error('Receta no válida');
        }
        currentRecipe = receta;
        mostrarReceta(receta);
        // Cerrar el modal de recetas guardadas
        const modal = bootstrap.Modal.getInstance(document.getElementById('recetasGuardadasModal'));
        if (modal) {
            modal.hide();
        }
    } catch (error) {
        console.error('Error al ver receta:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la receta'
        });
    }
}

function mostrarReceta(receta) {
    // Validar que la receta tenga todos los campos necesarios
    if (!receta || !receta.nombre || !receta.ingredientes || !receta.pasos || !receta.valor_nutricional || !receta.tips) {
        console.error('Receta incompleta:', receta);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La receta generada está incompleta'
        });
        return;
    }

    // Mostrar el contenedor de la receta
    const resultadoReceta = document.getElementById('resultado-receta');
    if (!resultadoReceta) {
        console.error('Elemento #resultado-receta no encontrado');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo mostrar la receta'
        });
        return;
    }

    // Mostrar el contenedor de la receta
    resultadoReceta.classList.remove('d-none');

    // Actualizar título de la receta
    const recetaTitulo = document.getElementById('receta-titulo');
    if (recetaTitulo) recetaTitulo.textContent = receta.nombre || 'Receta sin nombre';

    // Actualizar información básica
    const tiempoPreparacion = document.getElementById('tiempo-preparacion');
    const dificultad = document.getElementById('dificultad');
    const porciones = document.getElementById('porciones');
    const calorias = document.getElementById('calorias');

    if (tiempoPreparacion) tiempoPreparacion.textContent = `Tiempo: ${receta.tiempo_preparacion || 'No especificado'}`;
    if (dificultad) dificultad.textContent = `Dificultad: ${receta.dificultad || 'No especificada'}`;
    if (porciones) porciones.textContent = `Porciones: ${receta.porciones || 'No especificadas'}`;
    if (calorias) calorias.textContent = `Calorías: ${receta.valor_nutricional?.calorias || 'N/A'}`;

    // Actualizar ingredientes
    const recetaIngredientes = document.getElementById('receta-ingredientes');
    if (recetaIngredientes) {
        recetaIngredientes.innerHTML = (receta.ingredientes || [])
            .map(ingrediente => `<li class="list-group-item">${ingrediente}</li>`)
            .join('') || '<li class="list-group-item">No hay ingredientes</li>';
    }

    // Actualizar valor nutricional
    const valorNutricional = document.getElementById('valor-nutricional');
    if (valorNutricional) {
        valorNutricional.innerHTML = `
            <p>Proteínas: ${receta.valor_nutricional?.proteinas || 'N/A'}</p>
            <p>Carbohidratos: ${receta.valor_nutricional?.carbohidratos || 'N/A'}</p>
            <p>Grasas: ${receta.valor_nutricional?.grasas || 'N/A'}</p>
        `;
    }

    // Actualizar pasos de preparación
    const recetaPasos = document.getElementById('receta-pasos');
    if (recetaPasos) {
        recetaPasos.innerHTML = (receta.pasos || [])
            .map(paso => `<li>${paso}</li>`)
            .join('') || '<li>No hay pasos disponibles</li>';
    }

    // Actualizar tips
    const recetaTips = document.getElementById('receta-tips');
    if (recetaTips) {
        recetaTips.innerHTML = (receta.tips || [])
            .map(tip => `<li>${tip}</li>`)
            .join('') || '<li>No hay tips disponibles</li>';
    }

    // Guardar la receta automáticamente
    try {
        fetch('/guardar_receta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(receta)
        });
    } catch (error) {
        console.error('Error al guardar la receta:', error);
    }
}

// Event Listeners
document.getElementById('ingrediente').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        agregarIngrediente();
    }
});
