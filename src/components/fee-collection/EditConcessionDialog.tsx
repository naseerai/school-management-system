"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const editConcessionSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

interface EditConcessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeName: string | undefined;
  defaultAmount: number;
  onSubmit: (values: z.infer<typeof editConcessionSchema>) => void;
  isSubmitting: boolean;
}

export function EditConcessionDialog({ open, onOpenChange, feeName, defaultAmount, onSubmit, isSubmitting }: EditConcessionDialogProps) {
  const form = useForm<z.infer<typeof editConcessionSchema>>({
    resolver: zodResolver(editConcessionSchema),
    values: { amount: defaultAmount },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print:hidden">
        <DialogHeader><DialogTitle>Edit Concession for {feeName}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Concession Amount</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Concession"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}