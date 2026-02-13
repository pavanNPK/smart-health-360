import express from 'express';
import cors from 'cors';
import { auditRequestMiddleware } from './middleware/auditRequest';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import patientsRoutes from './routes/patients';
import recordsRoutes from './routes/records';
import reportsRoutes from './routes/reports';
import importRoutes from './routes/import';
import exportRoutes from './routes/export';
import adminRoutes from './routes/admin';
import auditRoutes from './routes/audit';
import areasRoutes from './routes/areas';
import clinicsRoutes from './routes/clinics';
import attendanceRoutes from './routes/attendance';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit every authenticated request (method, path, status) for all roles
app.use(auditRequestMiddleware);

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/patients', patientsRoutes);
app.use(recordsRoutes);
app.use(reportsRoutes);
app.use(importRoutes);
app.use(exportRoutes);
app.use('/admin', adminRoutes);
app.use('/audit', auditRoutes);
app.use('/areas', areasRoutes);
app.use('/clinics', clinicsRoutes);
app.use('/attendance', attendanceRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, db: 'careers' }));

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
