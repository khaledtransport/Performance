import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

export const createRouteSchema = z.object({
    universityId: z.string().min(1, { message: "معرف الجامعة مطلوب" }),
    driverId: z.string().uuid({ message: "معرف السائق غير صالح" }),
    busId: z.string().uuid({ message: "معرف الباص غير صالح" }),
    districtId: z.string().uuid({ message: "معرف الحي غير صالح" }).optional(),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;

export function validateRequest<T>(schema: z.ZodSchema<T>) {
    return async (request: NextRequest): Promise<{ data: T | null; error: NextResponse | null }> => {
        try {
            const body = await request.json();
            const result = schema.safeParse(body);
            if (!result.success) {
                console.error("Validation failed:", JSON.stringify(result.error.format(), null, 2));
                console.error("Request body was:", body);
                return {
                    data: null,
                    error: NextResponse.json(
                        { error: "بيانات غير صالحة", details: result.error.format() },
                        { status: 400 }
                    ),
                };
            }
            return { data: result.data, error: null };
        } catch {
            return {
                data: null,
                error: NextResponse.json({ error: "بيانات JSON غير صالحة" }, { status: 400 }),
            };
        }
    };
}
