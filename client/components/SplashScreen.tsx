export function SplashScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            <span className="font-normal">trusty</span>
            <span className="font-bold">PCS</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Loading your session...
          </p>
        </div>
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-100" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-200" />
        </div>
      </div>
    </div>
  );
}
