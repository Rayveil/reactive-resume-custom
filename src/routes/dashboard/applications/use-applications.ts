import { useEffect, useState } from "react";
import type { Application } from "@/schema/application";
import { LocalApplicationStorage } from "@/services/application-storage";

export function useApplications(userId: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    try {
      setLoading(true);
      setError(null);
      const data = LocalApplicationStorage.getAll(userId);
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const create = (application: Omit<Application, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newApp = LocalApplicationStorage.create({
        ...application,
        id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Application);
      setApplications((prev) => [...prev, newApp]);
      return newApp;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
      return null;
    }
  };

  const update = (id: string, updates: Partial<Application>) => {
    try {
      const updated = LocalApplicationStorage.update(id, updates);
      if (updated) {
        setApplications((prev) => prev.map((app) => (app.id === id ? updated : app)));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application");
      return null;
    }
  };

  const delete_ = (id: string) => {
    try {
      const success = LocalApplicationStorage.delete(id);
      if (success) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete application");
      return false;
    }
  };

  const stats = {
    total: applications.length,
    draft: applications.filter((a) => a.status === "draft").length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    interviewing: applications.filter((a) => a.status === "interviewing").length,
    offer: applications.filter((a) => a.status === "offer").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  useEffect(() => {
    load();
  }, [userId]);

  return {
    applications,
    loading,
    error,
    create,
    update,
    delete: delete_,
    refresh: load,
    stats,
  };
}
