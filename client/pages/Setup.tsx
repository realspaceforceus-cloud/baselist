import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setup } from "@/lib/api";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  loading: boolean;
  error?: string;
}

export const Setup = (): JSX.Element => {
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [baseId] = useState("vance-afb"); // Default to Vance AFB
  const [includeSampleData, setIncludeSampleData] = useState(false);
  const [setupStarted, setSetupStarted] = useState(false);

  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "verify",
      title: "Verify Database",
      description: "Checking Supabase connection",
      completed: false,
      loading: false,
    },
    {
      id: "admin",
      title: "Create Admin Account",
      description: "Set up your administrator account",
      completed: false,
      loading: false,
    },
    {
      id: "finalize",
      title: "Complete Setup",
      description: "Finalize configuration",
      completed: false,
      loading: false,
    },
  ]);

  const validateInputs = (): boolean => {
    if (!adminUsername || adminUsername.length < 3) {
      toast.error("Admin username must be at least 3 characters");
      return false;
    }

    if (!adminPassword || adminPassword.length < 8) {
      toast.error("Admin password must be at least 8 characters");
      return false;
    }

    if (!adminEmail || !adminEmail.includes("@")) {
      toast.error("Please provide a valid admin email");
      return false;
    }

    if (!baseId) {
      toast.error("Please select a base/installation");
      return false;
    }

    return true;
  };

  const updateStep = (id: string, updates: Partial<SetupStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step)),
    );
  };

  const verifyDatabase = async () => {
    updateStep("verify", { loading: true, error: undefined });

    try {
      const result = await setup.checkStatus();

      if (result.setupComplete) {
        updateStep("verify", {
          loading: false,
          error: "Setup already complete",
        });
        toast.error("This application is already set up");
        return false;
      }

      updateStep("verify", { loading: false, completed: true });
      toast.success("Database verified");
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Verification failed";
      updateStep("verify", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const createAdmin = async () => {
    updateStep("admin", { loading: true, error: undefined });

    try {
      const result = await setup.initialize(
        adminEmail,
        adminPassword,
        adminUsername,
        baseId,
        includeSampleData,
      );

      updateStep("admin", { loading: false, completed: true });
      toast.success("Admin account created");
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to create admin";
      updateStep("admin", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const finalize = async () => {
    updateStep("finalize", { loading: true, error: undefined });

    try {
      toast.success("Setup complete! Redirecting...");
      updateStep("finalize", { loading: false, completed: true });

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Finalization failed";
      updateStep("finalize", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const handleStartSetup = async () => {
    if (!validateInputs()) return;

    setSetupStarted(true);

    const verified = await verifyDatabase();
    if (!verified) return;

    const adminCreated = await createAdmin();
    if (!adminCreated) return;

    await finalize();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            BaseList Setup Wizard
          </h1>
          <p className="text-slate-400">Complete your initial configuration</p>
        </div>

        <Card className="p-8 bg-slate-800 border-slate-700">
          {!setupStarted ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Admin Username
                </label>
                <Input
                  type="text"
                  placeholder="admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={setupStarted}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Admin Email
                </label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={setupStarted}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Admin Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  disabled={setupStarted}
                />
                <p className="text-xs text-slate-400 mt-1">Min 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Military Base / Installation
                </label>
                <select
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md disabled:opacity-50"
                  disabled={setupStarted}
                >
                  <option value="">Select a base...</option>
                  <option value="vance-afb">Vance AFB</option>
                  <option value="jblm">Joint Base Lewis-McChord</option>
                  <option value="ramstein-ab">Ramstein Air Base</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sampleData"
                  checked={includeSampleData}
                  onChange={(e) => setIncludeSampleData(e.target.checked)}
                  className="rounded border-slate-600"
                  disabled={setupStarted}
                />
                <label htmlFor="sampleData" className="text-sm text-slate-300">
                  Include sample data (optional)
                </label>
              </div>

              <Button
                onClick={handleStartSetup}
                disabled={setupStarted}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {setupStarted ? "Setting up..." : "Start Installation"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Installation will take approximately 30 seconds
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start space-x-4 p-4 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {step.loading ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    ) : step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : step.error ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-500" />
                    )}
                  </div>

                  <div className="flex-grow">
                    <p className="font-medium text-white">{step.title}</p>
                    <p className="text-sm text-slate-400">{step.description}</p>
                    {step.error && (
                      <p className="text-sm text-red-400 mt-1">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}

              {steps.every((s) => s.completed) && (
                <p className="text-center text-green-400 text-sm">
                  ✓ Setup complete! Redirecting...
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Setup;
