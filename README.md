# NestJS WhatsApp Chatbot

Un chatbot WhatsApp développé avec NestJS et intégré à l'API officielle de WhatsApp (Meta Cloud API).

## 🚀 Fonctionnalités

- ✅ Webhook sécurisé pour recevoir les messages WhatsApp entrants
- ✅ Service d'envoi de messages via l'API officielle Meta Cloud API v18.0
- ✅ Endpoints REST pour tester l'envoi de messages
- ✅ Gestion centralisée de la configuration avec validation
- ✅ Validation robuste des données avec class-validator
- ✅ Middleware de logging pour toutes les requêtes
- ✅ Architecture modulaire NestJS
- ✅ Documentation Swagger automatique
- ✅ Gestion d'erreurs complète
- ✅ Support des messages texte et templates

## 🛠️ Installation

1. **Cloner le projet et installer les dépendances:**
```bash
npm install
```

2. **Configurer les variables d'environnement:**
```bash
cp .env.example .env
```

Puis éditer le fichier `.env` avec vos informations WhatsApp Business API:

```env
# Configuration WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
WHATSAPP_API_VERSION=v18.0

# Configuration Application
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

## 🔧 Configuration WhatsApp Business API

### 1. Créer une application Meta for Developers

1. Aller sur [Meta for Developers](https://developers.facebook.com/)
2. Créer une nouvelle application
3. Ajouter le produit "WhatsApp Business"

### 2. Obtenir les tokens

- **Access Token**: Dans la console WhatsApp Business API
- **Phone Number ID**: ID du numéro de téléphone configuré
- **Webhook Verify Token**: Token de votre choix pour sécuriser le webhook

### 3. Configurer le webhook

URL du webhook: `https://votre-domaine.com/webhook/whatsapp`

## 🚀 Démarrage

### Mode développement
```bash
npm run start:dev
```

### Mode production
```bash
npm run build
npm run start:prod
```

L'application sera accessible sur `http://localhost:3000`

## 📚 Documentation API

Une fois l'application démarrée, la documentation Swagger est disponible sur:
`http://localhost:3000/api/docs`

## 🔄 Endpoints principaux

### Santé de l'application
- `GET /` - Message de bienvenue
- `GET /health` - Statut de l'application

### Messages WhatsApp
- `POST /whatsapp/send` - Envoyer un message (flexible)
- `POST /whatsapp/send/text` - Envoyer un message texte
- `POST /whatsapp/send/template` - Envoyer un message template
- `GET /whatsapp/test/:phoneNumber` - Envoyer un message de test

### Webhook
- `GET /webhook/whatsapp` - Vérification du webhook
- `POST /webhook/whatsapp` - Réception des messages entrants
- `GET /webhook/test` - Test du webhook

## 📤 Exemples d'utilisation

### Envoyer un message texte
```bash
curl -X POST http://localhost:3000/whatsapp/send/text \
  -H "Content-Type: application/json" \
  -d '{
    "to": "33123456789",
    "text": "Bonjour! Ceci est un message de test."
  }'
```

### Envoyer un message template
```bash
curl -X POST http://localhost:3000/whatsapp/send/template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "33123456789",
    "templateName": "hello_world",
    "languageCode": "fr"
  }'
```

### Test rapide
```bash
curl http://localhost:3000/whatsapp/test/33123456789
```

## 🏗️ Architecture

```
src/
├── app.module.ts              # Module principal
├── main.ts                    # Point d'entrée
├── config/
│   └── env.validation.ts      # Validation des variables d'environnement
├── common/
│   └── interceptors/
│       └── logging.interceptor.ts  # Intercepteur de logging
└── whatsapp/
    ├── whatsapp.module.ts     # Module WhatsApp
    ├── whatsapp.service.ts    # Service principal WhatsApp
    ├── whatsapp.controller.ts # Contrôleur API REST
    ├── webhook.controller.ts  # Contrôleur webhook
    ├── dto/                   # Data Transfer Objects
    └── interfaces/           # Interfaces TypeScript
```

## 🔧 Scripts disponibles

- `npm run start:dev` - Démarrage en mode développement avec rechargement automatique
- `npm run build` - Construction pour la production
- `npm run start:prod` - Démarrage en mode production
- `npm run test` - Exécution des tests
- `npm run lint` - Vérification du code avec ESLint

## 🛡️ Sécurité

- Validation des tokens webhook
- Validation des données entrantes avec class-validator
- Variables d'environnement pour les informations sensibles
- Gestion d'erreurs complète
- CORS configuré pour les tests

## 📝 Logs

Le système de logging capture:
- Toutes les requêtes HTTP (entrée/sortie)
- Messages WhatsApp envoyés/reçus
- Erreurs avec stack traces
- Temps de réponse des APIs

## 🔄 Fonctionnalités du chatbot

Le chatbot inclut une réponse automatique de base qui:
- Accueille l'utilisateur par son nom
- Confirme la réception du message
- Propose de l'aide

Vous pouvez personnaliser la logique dans `WhatsappService.handleIncomingMessage()`.

## 🚀 Prochaines étapes

- [ ] Ajouter une base de données pour stocker les conversations
- [ ] Implémenter des flux de conversation plus complexes
- [ ] Ajouter le support des médias (images, documents, audio)
- [ ] Intégrer une IA pour des réponses intelligentes
- [ ] Ajouter des métriques et monitoring
- [ ] Tests unitaires et d'intégration

## 📞 Support

Pour toute question ou problème, consultez la documentation officielle:
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [NestJS Documentation](https://nestjs.com/)