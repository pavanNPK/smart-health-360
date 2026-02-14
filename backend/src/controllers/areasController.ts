import { Request, Response } from 'express';
import { z } from 'zod';
import { Area } from '../models/Area';
import { Clinic } from '../models/Clinic';

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
  const search = (req.query.search as string)?.trim();
  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
    ];
  }
  const areas = await Area.find(filter).sort({ name: 1 }).lean();
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

export async function deleteArea(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const clinicsInArea = await Clinic.countDocuments({ areaId: id });
  if (clinicsInArea > 0) {
    res.status(400).json({ message: 'Cannot delete area: it has clinics. Remove or reassign clinics first.' });
    return;
  }
  const area = await Area.findByIdAndDelete(id);
  if (!area) {
    res.status(404).json({ message: 'Area not found' });
    return;
  }
  res.status(204).send();
}
