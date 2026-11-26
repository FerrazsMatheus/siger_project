# React + Vite

## Notificações de decisão por e-mail

O sistema envia uma notificação pelo EmailJS quando o administrador aprova ou rejeita uma solicitação de reserva de lugar ou de aula extra. Configure no `.env.local` as variáveis `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` e `VITE_EMAILJS_PUBLIC_KEY` (há um modelo em `.env.example`) e reinicie o servidor Vite.

No template EmailJS, configure o campo **To Email** como `{{to_email}}`. Para o template atual, são enviados `nome_usuario`, `status_texto`, `tipo_solicitacao`, `item_titulo`, `data_horario` e `observacao_admin`. Também há aliases para nome, status, local, data, horário, propósito, descrição, matéria, turmas, justificativa e mensagem. Os nomes dentro de `{{...}}` precisam corresponder às chaves enviadas. O usuário do EmailJS é sua chave pública; não coloque a chave privada no frontend.

## Contas verificadas sem Cloud Functions

As contas verificadas só podem ser editadas enquanto ainda não foram cadastradas. As regras do Firestore também bloqueiam alterações administrativas após o cadastro. Ao excluir uma conta verificada cadastrada, a aplicação remove em lote o perfil vinculado em `users` e o registro em `verifiedAccounts`. A credencial correspondente no Firebase Authentication não pode ser excluída com segurança pelo navegador do administrador; sem backend privilegiado, ela permanece sem perfil e não consegue acessar os dados do SIGER.

Se houver alguma troca de e-mail iniciada antes desse bloqueio e marcada como pendente, o usuário ainda poderá concluir a migração pela tela de confirmação do SIGER. Publique as regras atualizadas do Firestore para aplicar o bloqueio de edição também no banco.

## Aulas Extras no plano Spark

O fluxo de Aulas Extras usa transações do Cloud Firestore e regras de segurança; não depende de Cloud Functions nem do plano Blaze. Para publicar as regras no projeto Firebase configurado na aplicação, use o Firebase CLI:

```sh
firebase deploy --only firestore:rules --project <ID_DO_PROJETO>
```

Cada solicitação pode selecionar até 8 turmas. Esse limite permite que as regras do Firestore validem individualmente os documentos de turma existentes, junto com a identidade institucional do professor.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
