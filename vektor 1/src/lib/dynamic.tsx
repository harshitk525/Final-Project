import * as React from "react";

type DynamicOptions = {
  ssr?: boolean;
  loading?: () => React.ReactNode;
};

export default function dynamic<P = {}>(
  loader: () => Promise<any>,
  options: DynamicOptions = {}
): React.ComponentType<P & { ref?: any }> {
  let CachedComponent: React.ComponentType<P> | null = null;

  const Forwarded = React.forwardRef<any, P>((props, ref) => {
    const [Component, setComponent] = React.useState<React.ComponentType<P> | null>(() => CachedComponent);
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      if (Component) return;
      let mounted = true;
      loader()
        .then((mod) => {
          if (!mounted) return;
          const comp = mod?.default?.default || mod?.default || mod;
          CachedComponent = comp;
          setComponent(() => comp);
        })
        .catch((err) => {
          console.error("Failed to load dynamic component:", err);
          if (mounted) setHasError(true);
        });
      return () => {
        mounted = false;
      };
    }, [Component]);

    if (hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-4 text-xs text-rose-400">
          Failed to load 3D engine.
        </div>
      );
    }

    if (!Component) {
      const LoadingComponent = options.loading;
      return LoadingComponent ? <>{LoadingComponent()}</> : null;
    }

    return <Component {...(props as any)} ref={ref} />;
  });
  Forwarded.displayName = "DynamicForwardedComponent";

  return Forwarded as unknown as React.ComponentType<P & { ref?: any }>;
}
