/**
 * COLRIFAS - Lógica del Cliente
 * --------------------------------------------------
 * Este archivo gestiona la redirección de WhatsApp, el alternador de temas claro/oscuro,
 * la navegación del carrusel de opiniones y las animaciones de revelado.
 */

// 1. CONFIGURACIÓN DEL ENLACE DE REDIRECCIÓN A WHATSAPP
// Reemplaza esta URL con el enlace real de tu grupo de WhatsApp
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/G5gR8p6QzS2J5x9Eexample";

// Si deseas que la reserva de números se envíe a un número de WhatsApp específico (Soporte/Administrador)
// ingresa el número con código de país aquí (ej: "573123456789"). Si se deja vacío "", 
// la reserva redirigirá al grupo de WhatsApp configurado arriba.
const SUPPORT_WHATSAPP_NUMBER = "";

// Manejar la redirección a WhatsApp para todos los elementos con la clase "whatsapp-trigger-link"
document.querySelectorAll(".whatsapp-trigger-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    
    // Animación de escala pequeña para retroalimentación visual al hacer clic
    link.style.transform = "scale(0.95)";
    setTimeout(() => {
      link.style.transform = "";
      // Abrir enlace en pestaña nueva
      window.open(WHATSAPP_GROUP_URL, "_blank", "noopener,noreferrer");
    }, 150);
  });
});

// 2. ALTERNADOR DE TEMA CLARO Y OSCURO (DARK & LIGHT MODE)
const themeToggleBtn = document.getElementById("theme-toggle");

themeToggleBtn.addEventListener("click", () => {
  // Obtener el tema actual desde el atributo data-theme del HTML
  const currentTheme = document.documentElement.getAttribute("data-theme");
  let newTheme = "light";
  
  if (currentTheme === "light") {
    newTheme = "dark";
  }
  
  // Aplicar el nuevo tema
  document.documentElement.setAttribute("data-theme", newTheme);
  
  // Guardar la elección del usuario en localStorage
  localStorage.setItem("theme", newTheme);
  
  // Feedback sutil en el botón
  themeToggleBtn.style.transform = "rotate(30deg) scale(0.9)";
  setTimeout(() => {
    themeToggleBtn.style.transform = "";
  }, 200);
});

// Escuchar los cambios del sistema en tiempo real si el usuario no ha forzado un tema
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const savedTheme = localStorage.getItem("theme");
  if (!savedTheme) {
    const newTheme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
  }
});

// 2.1 MENÚ HAMBURGUESA EN MÓVIL
const menuToggleBtn = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

if (menuToggleBtn && navMenu) {
  menuToggleBtn.addEventListener("click", () => {
    menuToggleBtn.classList.toggle("active");
    navMenu.classList.toggle("active");
    
    // Bloquear/desbloquear scroll de fondo
    if (navMenu.classList.contains("active")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  });

  // Cerrar menú al hacer clic en un enlace de navegación
  navMenu.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      menuToggleBtn.classList.remove("active");
      navMenu.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
}


// 3. NAVEGACIÓN DEL CARRUSEL DE OPINIONES / GANADORES
const carousel = document.getElementById("winners-carousel");
const prevBtn = document.getElementById("carousel-prev");
const nextBtn = document.getElementById("carousel-next");

if (carousel && prevBtn && nextBtn) {
  // Función para obtener el ancho dinámico de una tarjeta
  const getScrollAmount = () => {
    const card = carousel.querySelector(".carousel-card");
    if (card) {
      const cardStyle = window.getComputedStyle(card);
      const cardWidth = card.offsetWidth;
      const cardMarginRight = parseInt(cardStyle.marginRight) || 0;
      const cardMarginLeft = parseInt(cardStyle.marginLeft) || 0;
      return cardWidth + cardMarginRight + cardMarginLeft + 15; // sumamos gap extra
    }
    return 300;
  };

  // Botón Siguiente
  nextBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: getScrollAmount(),
      behavior: "smooth"
    });
  });

  // Botón Anterior
  prevBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: -getScrollAmount(),
      behavior: "smooth"
    });
  });

  // Deshabilitar flechas en los extremos (Opcional, para pulido de UI)
  const toggleNavButtons = () => {
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    
    // Margen de tolerancia de 5px para navegadores que reportan decimales
    if (carousel.scrollLeft <= 5) {
      prevBtn.style.opacity = "0.5";
      prevBtn.style.pointerEvents = "none";
    } else {
      prevBtn.style.opacity = "1";
      prevBtn.style.pointerEvents = "auto";
    }

    if (carousel.scrollLeft >= maxScrollLeft - 5) {
      nextBtn.style.opacity = "0.5";
      nextBtn.style.pointerEvents = "none";
    } else {
      nextBtn.style.opacity = "1";
      nextBtn.style.pointerEvents = "auto";
    }
  };

  // Escuchar evento de scroll con throttle
  let scrollTimeout;
  carousel.addEventListener("scroll", () => {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(() => {
        toggleNavButtons();
        scrollTimeout = null;
      }, 100);
    }
  });

  // Inicializar estado de botones
  setTimeout(toggleNavButtons, 200);
}


// 4. MOCKUP Y REPRODUCCIÓN DE VIDEO EN TESTIMONIOS
// Si el usuario hace clic en el botón de Play en los ganadores, se reproduce el video real (si existe) o simulamos una carga
document.querySelectorAll(".play-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // Evitar que el clic active eventos del contenedor
    
    const card = btn.closest(".carousel-card");
    const name = card.querySelector(".winner-name").textContent;
    const prize = card.querySelector(".winner-prize").textContent;
    const videoSrc = card.getAttribute("data-video-src");
    
    // Crear un overlay flotante para la reproducción
    const overlay = document.createElement("div");
    overlay.className = "video-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.3s ease;
      color: #ffffff;
      padding: 24px;
    `;
    
    if (videoSrc) {
      // Si hay un video real configurado, lo reproducimos con controles y audio
      overlay.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 500px; aspect-ratio: 9/16; background-color: #000; border-radius: 16px; overflow: hidden; border: 1px solid var(--gold-primary); box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <video src="${videoSrc}" controls autoplay playsinline style="width: 100%; height: 100%; object-fit: contain;"></video>
          <button class="close-video-btn" style="position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(0,0,0,0.5); color: #fff; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; z-index: 10;">&times;</button>
        </div>
      `;
    } else {
      // Mockup original para testimonios sin video real
      overlay.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 500px; aspect-ratio: 9/16; background-color: #000; border-radius: 16px; overflow: hidden; border: 1px solid var(--gold-primary); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px;">
            <span style="font-size: 3rem; margin-bottom: 20px; animation: bounce 1.5s infinite;">🏆</span>
            <h2 style="font-family: var(--font-secondary); color: var(--gold-primary); margin-bottom: 8px;">Entrega en Vivo</h2>
            <p style="font-weight: 700; margin-bottom: 20px;">${name}</p>
            <p style="font-size: 0.9rem; color: #aaa; max-width: 300px; margin-bottom: 30px;">
              El video completo de la entrega del premio (${prize}) se encuentra disponible en nuestro grupo exclusivo de WhatsApp.
            </p>
            <a href="#" class="btn btn-whatsapp btn-glow whatsapp-trigger-link-inner" style="width: auto;">
              <span>Ver video en WhatsApp</span>
            </a>
          </div>
          
          <button class="close-video-btn" style="position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(255,255,255,0.2); color: #fff; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;">&times;</button>
        </div>
      `;
    }
    
    document.body.appendChild(overlay);
    
    // Forzar reflow y activar transición
    setTimeout(() => overlay.style.opacity = "1", 50);
    
    // Evento cerrar overlay
    const closeBtn = overlay.querySelector(".close-video-btn");
    const videoElem = overlay.querySelector("video");
    const closeOverlay = () => {
      overlay.style.opacity = "0";
      if (videoElem) {
        videoElem.pause();
      }
      setTimeout(() => overlay.remove(), 300);
    };
    
    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });
    
    // Manejar el botón de WhatsApp interno del overlay (si existe)
    const innerLink = overlay.querySelector(".whatsapp-trigger-link-inner");
    if (innerLink) {
      innerLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(WHATSAPP_GROUP_URL, "_blank", "noopener,noreferrer");
        closeOverlay();
      });
    }
  });
});


// 5. ANIMACIONES AL HACER SCROLL (REVELADO SUAVE)
// Usamos Intersection Observer para revelar secciones cuando entran en el viewport
const revealOnScroll = () => {
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // Dejar de observar una vez revelado
      }
    });
  }, observerOptions);

  // Agregar clase de preparación y observar elementos
  const itemsToReveal = [
    ...document.querySelectorAll(".step-card"),
    ...document.querySelectorAll(".section-header"),
    ...document.querySelectorAll(".carousel-outer-wrapper"),
    ...document.querySelectorAll(".cta-banner-container")
  ];

  // Añadir estilos inline necesarios para la animación de revelado con curvas Apple
  const style = document.createElement("style");
  style.innerHTML = `
    .step-card, .section-header, .carousel-outer-wrapper, .cta-banner-container {
      opacity: 0;
      transform: translateY(40px) scale(0.98);
      transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .step-card.visible, .section-header.visible, .carousel-outer-wrapper.visible, .cta-banner-container.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    /* Añadir retardos escalonados para las tarjetas de pasos */
    #step-card-1 { transition-delay: 0.1s; }
    #step-card-2 { transition-delay: 0.25s; }
    #step-card-3 { transition-delay: 0.4s; }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);

  itemsToReveal.forEach(item => {
    observer.observe(item);
  });
};

// 6. SCROLL PARALLAX PARA LA GALERÍA DEL HERO (ESTILO APPLE)
const initHeroParallax = () => {
  const col1 = document.querySelector(".grid-col.col-1");
  const col2 = document.querySelector(".grid-col.col-2");
  const col3 = document.querySelector(".grid-col.col-3");
  
  if (!col1 || !col2 || !col3) return;
  
  let ticking = false;
  
  const updateParallax = () => {
    const scrolled = window.scrollY;
    
    // Solo aplicar parallax en pantallas grandes para rendimiento óptimo
    if (window.innerWidth > 992) {
      // Columna 1 se desplaza sutilmente hacia abajo (efecto lento)
      col1.style.transform = `translateY(${scrolled * 0.08}px)`;
      // Columna 2 se desplaza hacia arriba con un offset inicial de 60px
      col2.style.transform = `translateY(${60 + (scrolled * -0.05)}px)`;
      // Columna 3 se desplaza más rápido hacia abajo
      col3.style.transform = `translateY(${scrolled * 0.12}px)`;
    } else {
      // Resetear estilos en responsive móvil/tablet
      col1.style.transform = "";
      col2.style.transform = "";
      col3.style.transform = "";
    }
    ticking = false;
  };
  
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
  
  // Resetear estilos al cambiar tamaño de pantalla
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 992) {
      col1.style.transform = "";
      col2.style.transform = "";
      col3.style.transform = "";
    }
  });
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  revealOnScroll();
  initHeroParallax();
});
