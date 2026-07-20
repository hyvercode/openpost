import { EmailService } from './server/src/services/email.service.ts';
const s = new EmailService();
s.sendInvitationEmail('test@test.com', 'test', 'http://test').then(console.log).catch(console.error);
