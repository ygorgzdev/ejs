// Este arquivo pode ser usado se você quiser separar o JavaScript,
// mas para este exemplo, o Alpine.js foi configurado diretamente no HTML.

// Exemplo de como você poderia registrar o carouselData globalmente se quisesse:
// document.addEventListener('alpine:init', () => {
//     Alpine.data('carouselData', () => ({
//         currentIndex: 0,
//         slides: [
//             { image: '/images/carousel1.jpg', title: 'Inovação e Criatividade', caption: 'Transformamos ideias em soluções digitais impactantes.' },
//             { image: '/images/carousel2.jpg', title: 'Colaboração Eficiente', caption: 'Trabalhe em equipe de forma integrada e produtiva.' },
//             { image: '/images/carousel3.jpg', title: 'Resultados Extraordinários', caption: 'Alcance seus objetivos com nossa plataforma.' }
//         ],
//         prevSlide() {
//             this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
//         },
//         nextSlide() {
//             this.currentIndex = (this.currentIndex + 1) % this.slides.length;
//         },
//         init() {
//             // setInterval(() => { this.nextSlide(); }, 5000);
//         }
//     }));
// });