import { Request, Response } from 'express';
import { z } from 'zod';
import { Area } from '../models/Area';

const createAreaSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function createArea(req: Request, res: Response): Promise<void> {
  const parsed = createAreaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const area = await Area.create(parsed.data);
  res.status(201).json(area);
}

export async function listAreas(req: Request, res: Response): Promise<void> {
  const areas = await Area.find().sort({ name: 1 }).lean();
  res.json({ data: areas });
}

export async function updateArea(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = createAreaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
    return;
  }
  const area = await Area.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  if (!area) {
    res.status(404).json({ message: 'Area not found' });
    return;
  }
  res.json(area);
}
