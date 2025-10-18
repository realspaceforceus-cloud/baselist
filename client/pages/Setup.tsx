import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  loading: boolean;
  error?: string;
}

export const Setup = (): JSX.Element => {
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("3306");
  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbDatabase, setDbDatabase] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [includeSampleData, setIncludeSampleData] = useState(true);
  const [setupStarted, setSetupStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "connection",
      title: "Test Database Connection",
      description: "Verify your MySQL database is accessible",
      completed: false,
      loading: false,
    },
    {
      id: "tables",
      title: "Create Database Tables",
      description: "Set up all required database schema",
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
      title: "Finalize Setup",
      description: "Generate configuration files",
      completed: false,
      loading: false,
    },
  ]);

  // Validate form before starting
  const validateInputs = (): boolean => {
    if (!dbHost || !dbUsername || !dbPassword || !dbDatabase) {
      toast.error("Please fill in all database fields");
      return false;
    }

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

    return true;
  };

  const updateStep = (id: string, updates: Partial<SetupStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  };

  const testConnection = async () => {
    updateStep("connection", { loading: true, error: undefined });

    try {
      const response = await fetch("/api/setup/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort) || 3306,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        updateStep("connection", {
          loading: false,
          error: data.error || "Connection failed",
        });
        toast.error(data.error || "Connection failed");
        return false;
      }

      updateStep("connection", { loading: false, completed: true });
      toast.success("Database connection successful");
      setCurrentStep(1);
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Connection failed";
      updateStep("connection", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const createTables = async () => {
    updateStep("tables", { loading: true, error: undefined });

    try {
      const response = await fetch("/api/setup/initialize-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort) || 3306,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        updateStep("tables", {
          loading: false,
          error: data.error || "Table creation failed",
        });
        toast.error(data.error || "Table creation failed");
        return false;
      }

      updateStep("tables", { loading: false, completed: true });
      toast.success("Database tables created");
      setCurrentStep(2);
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Table creation failed";
      updateStep("tables", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const createAdmin = async () => {
    updateStep("admin", { loading: true, error: undefined });

    try {
      const response = await fetch("/api/setup/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort) || 3306,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
          adminUsername,
          adminPassword,
          adminEmail,
          includeSampleData,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        updateStep("admin", {
          loading: false,
          error: data.error || "Admin creation failed",
        });
        toast.error(data.error || "Admin creation failed");
        return false;
      }

      updateStep("admin", { loading: false, completed: true });
      toast.success("Admin account created");
      setCurrentStep(3);
      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Admin creation failed";
      updateStep("admin", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const finalizeSetup = async () => {
    updateStep("finalize", { loading: true, error: undefined });

    try {
      const response = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort) || 3306,
          username: dbUsername,
          password: dbPassword,
          database: dbDatabase,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        updateStep("finalize", {
          loading: false,
          error: data.error || "Finalization failed",
        });
        toast.error(data.error || "Finalization failed");
        return false;
      }

      updateStep("finalize", { loading: false, completed: true });
      toast.success("Setup completed successfully!");

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);

      return true;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Finalization failed";
      updateStep("finalize", { loading: false, error: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const startSetup = async () => {
    if (!validateInputs()) return;

    setSetupStarted(true);
    setCurrentStep(0);

    const connectionOk = await testConnection();
    if (!connectionOk) return;

    const tablesOk = await createTables();
    if (!tablesOk) return;

    const adminOk = await createAdmin();
    if (!adminOk) return;

    await finalizeSetup();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            BaseList Setup Wizard
          </h1>
          <p className="text-gray-600">
            Configure your database and create your admin account
          </p>
        </div>

        {!setupStarted ? (
          <Card className="p-8 bg-white shadow-xl">
            <div className="space-y-6">
              {/* Database Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Database Configuration
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MySQL Host
                      </label>
                      <Input
                        type="text"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        placeholder="localhost"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Usually "localhost" on shared hosting
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port
                      </label>
                      <Input
                        type="number"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        placeholder="3306"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Default MySQL port
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Database Name
                    </label>
                    <Input
                      type="text"
                      value={dbDatabase}
                      onChange={(e) => setDbDatabase(e.target.value)}
                      placeholder="baselist_db"
                      className="rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The database you created in cPanel
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Database Username
                      </label>
                      <Input
                        type="text"
                        value={dbUsername}
                        onChange={(e) => setDbUsername(e.target.value)}
                        placeholder="baselist_user"
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Database Password
                      </label>
                      <Input
                        type="password"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="••••••••"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Section */}
              <div className="border-t pt-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Admin Account
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Username
                    </label>
                    <Input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Min 8 characters
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="border-t pt-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSampleData}
                    onChange={(e) => setIncludeSampleData(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include sample data (optional)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Creates a default base and sample listing for testing
                </p>
              </div>

              {/* Start Button */}
              <div className="pt-6">
                <Button
                  onClick={startSetup}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                >
                  Start Installation
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Progress Steps */
          <Card className="p-8 bg-white shadow-xl">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 transition-all ${
                    step.completed
                      ? "border-green-200 bg-green-50"
                      : step.error
                        ? "border-red-200 bg-red-50"
                        : index === currentStep
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {step.completed && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                        {step.loading && (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                        )}
                        {step.error && (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        {!step.completed && !step.loading && !step.error && (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-gray-900">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 ml-8">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {step.error && (
                    <div className="mt-3 ml-8">
                      <p className="text-sm text-red-700 font-medium">
                        Error: {step.error}
                      </p>
                    </div>
                  )}

                  {step.completed && !step.loading && (
                    <div className="mt-3 ml-8">
                      <p className="text-sm text-green-700 font-medium">
                        ✓ Complete
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Final Status */}
              {steps.every((s) => s.completed) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-bold text-green-900">Setup Complete!</h3>
                  <p className="text-sm text-green-700">
                    Redirecting to login page...
                  </p>
                </div>
              )}

              {/* Error Retry */}
              {steps.some((s) => s.error) && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Try Again
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Installation will take approximately 1-2 minutes
        </p>
      </div>
    </div>
  );
};

export default Setup;
