document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const allQuestions = document.querySelectorAll('.faq-question');
      const allAnswers = document.querySelectorAll('.faq-answer');

      if (!button.classList.contains('active')) {
        allQuestions.forEach(item => {
          if (item !== button) {
            item.classList.remove('active');
          }
        });

        allAnswers.forEach(item => {
          if (item !== button.nextElementSibling) {
            item.classList.remove('show');
          }
        });
      }

      button.classList.toggle('active');
      const answer = button.nextElementSibling;
      answer.classList.toggle('show');
    });
  });
});
