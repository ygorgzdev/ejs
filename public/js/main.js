// Este é um arquivo JavaScript principal para funcionalidades do frontend
document.addEventListener('DOMContentLoaded', function () {
    console.log('IncubePro - Frontend carregado!');

    // Adiciona animações aos cards quando carregados
    const animateCards = () => {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate__animated', 'animate__fadeIn');
            }, index * 100);
        });
    };

    animateCards();

    // Validação do formulário de projeto (se existir na página)
    const newProjectForm = document.getElementById('new-project-form');
    if (newProjectForm) {
        newProjectForm.addEventListener('submit', function (e) {
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;

            if (!title || !description) {
                e.preventDefault();
                alert('Por favor, preencha todos os campos obrigatórios!');
            }
        });
    }
});