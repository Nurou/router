import * as React from 'react'

import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { createEffect, createRoot, untrack, unwrap } from '@solidjs/reactivity'

import {
  AnyRoute,
  CheckId,
  rootRouteId,
  Route,
  RegisteredAllRouteInfo,
  RegisteredRouter,
  RouterStore,
  ToIdOption,
  last,
  sharedClone,
} from '@tanstack/router-core'
import {
  warning,
  RouterOptions,
  RouteMatch,
  MatchRouteOptions,
  RouteConfig,
  AnyRouteConfig,
  AnyAllRouteInfo,
  DefaultAllRouteInfo,
  functionalUpdate,
  createRouter,
  AnyRouteInfo,
  AllRouteInfo,
  RouteInfo,
  ValidFromPath,
  LinkOptions,
  RouteInfoByPath,
  ResolveRelativePath,
  NoInfer,
  ToOptions,
  invariant,
  Router,
} from '@tanstack/router-core'

export * from '@tanstack/router-core'

export type SyncRouteComponent<TProps = {}> = (
  props: TProps,
) => JSX.Element | React.ReactNode

export type RouteComponent<TProps = {}> = SyncRouteComponent<TProps> & {
  preload?: () => Promise<SyncRouteComponent<TProps>>
}

export function lazy(
  importer: () => Promise<{ default: SyncRouteComponent }>,
): RouteComponent {
  const lazyComp = React.lazy(importer as any)
  let promise: Promise<SyncRouteComponent>
  let resolvedComp: SyncRouteComponent

  const forwardedComp = React.forwardRef((props, ref) => {
    const resolvedCompRef = React.useRef(resolvedComp || lazyComp)
    return React.createElement(
      resolvedCompRef.current as any,
      { ...(ref ? { ref } : {}), ...props } as any,
    )
  })

  const finalComp = forwardedComp as unknown as RouteComponent

  finalComp.preload = () => {
    if (!promise) {
      promise = importer().then((module) => {
        resolvedComp = module.default
        return resolvedComp
      })
    }

    return promise
  }

  return finalComp
}

export type LinkPropsOptions<
  TAllRouteInfo extends AnyAllRouteInfo,
  TFrom extends ValidFromPath<TAllRouteInfo>,
  TTo extends string,
> = LinkOptions<TAllRouteInfo, TFrom, TTo> & {
  // A function that returns additional props for the `active` state of this link. These props override other props passed to the link (`style`'s are merged, `className`'s are concatenated)
  activeProps?:
    | React.AnchorHTMLAttributes<HTMLAnchorElement>
    | (() => React.AnchorHTMLAttributes<HTMLAnchorElement>)
  // A function that returns additional props for the `inactive` state of this link. These props override other props passed to the link (`style`'s are merged, `className`'s are concatenated)
  inactiveProps?:
    | React.AnchorHTMLAttributes<HTMLAnchorElement>
    | (() => React.AnchorHTMLAttributes<HTMLAnchorElement>)
}

export type MakeMatchRouteOptions<
  TAllRouteInfo extends AnyAllRouteInfo,
  TFrom extends ValidFromPath<TAllRouteInfo>,
  TTo extends string,
> = ToOptions<TAllRouteInfo, TFrom, TTo> &
  MatchRouteOptions & {
    // If a function is passed as a child, it will be given the `isActive` boolean to aid in further styling on the element it returns
    children?:
      | React.ReactNode
      | ((
          params: RouteInfoByPath<
            TAllRouteInfo,
            ResolveRelativePath<TFrom, NoInfer<TTo>>
          >['allParams'],
        ) => React.ReactNode)
  }

export type MakeLinkPropsOptions<
  TAllRouteInfo extends AnyAllRouteInfo,
  TFrom extends ValidFromPath<TAllRouteInfo>,
  TTo extends string,
> = LinkPropsOptions<TAllRouteInfo, TFrom, TTo> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>

export type MakeLinkOptions<
  TAllRouteInfo extends AnyAllRouteInfo,
  TFrom extends ValidFromPath<TAllRouteInfo>,
  TTo extends string,
> = LinkPropsOptions<TAllRouteInfo, TFrom, TTo> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
    // If a function is passed as a child, it will be given the `isActive` boolean to aid in further styling on the element it returns
    children?:
      | React.ReactNode
      | ((state: { isActive: boolean }) => React.ReactNode)
  }

declare module '@tanstack/router-core' {
  interface FrameworkGenerics {
    Component: RouteComponent
    ErrorComponent: RouteComponent<{
      error: unknown
      info: { componentStack: string }
    }>
  }

  interface RouterOptions<TRouteConfig, TRouterContext> {
    // ssrFooter?: () => JSX.Element | React.ReactNode
  }

  interface Router<
    TRouteConfig extends AnyRouteConfig = RouteConfig,
    TAllRouteInfo extends AnyAllRouteInfo = AllRouteInfo<TRouteConfig>,
  > {
    useStore: <T = RouterStore>(selector?: (state: Router['store']) => T) => T
    useRoute: <TId extends keyof TAllRouteInfo['routeInfoById']>(
      routeId: TId,
    ) => Route<TAllRouteInfo, TAllRouteInfo['routeInfoById'][TId]>
    useMatch: <
      TId extends keyof TAllRouteInfo['routeInfoById'],
      TStrict extends boolean = true,
    >(
      routeId: TId,
      opts?: { strict?: TStrict },
    ) => TStrict extends true
      ? RouteMatch<TAllRouteInfo, TAllRouteInfo['routeInfoById'][TId]>
      :
          | RouteMatch<TAllRouteInfo, TAllRouteInfo['routeInfoById'][TId]>
          | undefined
    linkProps: <TTo extends string = '.'>(
      props: MakeLinkPropsOptions<TAllRouteInfo, '/', TTo>,
    ) => React.AnchorHTMLAttributes<HTMLAnchorElement>
    Link: <TTo extends string = '.'>(
      props: MakeLinkOptions<TAllRouteInfo, '/', TTo>,
    ) => JSX.Element
    MatchRoute: <TTo extends string = '.'>(
      props: MakeMatchRouteOptions<TAllRouteInfo, '/', TTo>,
    ) => JSX.Element
  }

  interface Route<
    TAllRouteInfo extends AnyAllRouteInfo = DefaultAllRouteInfo,
    TRouteInfo extends AnyRouteInfo = RouteInfo,
  > {
    useRoute: <
      TTo extends string = '.',
      TResolved extends string = ResolveRelativePath<
        TRouteInfo['id'],
        NoInfer<TTo>
      >,
    >(
      routeId: CheckId<
        TAllRouteInfo,
        TResolved,
        ToIdOption<TAllRouteInfo, TRouteInfo['id'], TTo>
      >,
      opts?: { strict?: boolean },
    ) => Route<TAllRouteInfo, TAllRouteInfo['routeInfoById'][TResolved]>
    linkProps: <TTo extends string = '.'>(
      props: MakeLinkPropsOptions<TAllRouteInfo, TRouteInfo['fullPath'], TTo>,
    ) => React.AnchorHTMLAttributes<HTMLAnchorElement>
    Link: <TTo extends string = '.'>(
      props: MakeLinkOptions<TAllRouteInfo, TRouteInfo['fullPath'], TTo>,
    ) => JSX.Element
    MatchRoute: <TTo extends string = '.'>(
      props: MakeMatchRouteOptions<TAllRouteInfo, TRouteInfo['fullPath'], TTo>,
    ) => JSX.Element
  }
}

export type PromptProps = {
  message: string
  when?: boolean | any
  children?: React.ReactNode
}

//

export function Link<TTo extends string = '.'>(
  props: MakeLinkOptions<RegisteredAllRouteInfo, '/', TTo>,
): JSX.Element {
  const router = useRouter()
  return <router.Link {...(props as any)} />
}

type MatchesContextValue = RouteMatch[]

export const matchesContext = React.createContext<MatchesContextValue>(null!)
export const routerContext = React.createContext<{ router: RegisteredRouter }>(
  null!,
)

export type MatchesProviderProps = {
  value: MatchesContextValue
  children: React.ReactNode
}

const EMPTY = {}

export const __useStoreValue = <TSeed, TReturn>(
  seed: () => TSeed,
  selector?: (seed: TSeed) => TReturn,
): TReturn => {
  const valueRef = React.useRef<TReturn>(EMPTY as any)

  // If there is no selector, track the seed
  // If there is a selector, do not track the seed
  const getValue = () =>
    (!selector
      ? unwrap(seed())
      : selector(untrack(() => unwrap(seed())))) as TReturn

  // If empty, initialize the value
  if (valueRef.current === EMPTY) {
    valueRef.current = sharedClone(undefined, getValue())
  }

  // Snapshot should just return the current cached value
  const getSnapshot = React.useCallback(() => valueRef.current, [])

  const getStore = React.useCallback((cb: () => void) => {
    // A root is necessary to track effects
    return createRoot(() => {
      createEffect(() => {
        // Read and update the value
        // getValue will handle which values are acccessed and
        // thus tracked.
        // sharedClone will both recursively track the end result
        // and ensure that the previous value is structurally shared
        // into the new version.
        valueRef.current = sharedClone(valueRef.current, getValue())
        cb()
      })
    })
  }, [])

  return useSyncExternalStore(getStore, getSnapshot, getSnapshot)
}

export function createReactRouter<
  TRouteConfig extends AnyRouteConfig = RouteConfig,
  TAllRouteInfo extends AnyAllRouteInfo = AllRouteInfo<TRouteConfig>,
  TRouterContext = unknown,
>(
  opts: RouterOptions<TRouteConfig, TRouterContext>,
): Router<TRouteConfig, TAllRouteInfo, TRouterContext> {
  const makeRouteExt = (
    route: AnyRoute,
    router: Router<any, any, any>,
  ): Pick<AnyRoute, 'useRoute' | 'linkProps' | 'Link' | 'MatchRoute'> => {
    return {
      useRoute: (subRouteId = '.' as any) => {
        const resolvedRouteId = router.resolvePath(
          route.routeId,
          subRouteId as string,
        )

        const resolvedRoute = router.getRoute(resolvedRouteId)

        invariant(
          resolvedRoute,
          `Could not find a route for route "${
            resolvedRouteId as string
          }"! Did you forget to add it to your route config?`,
        )

        return resolvedRoute
      },
      linkProps: (options) => {
        const {
          // custom props
          type,
          children,
          target,
          activeProps = () => ({ className: 'active' }),
          inactiveProps = () => ({}),
          activeOptions,
          disabled,
          // fromCurrent,
          hash,
          search,
          params,
          to,
          preload,
          preloadDelay,
          preloadMaxAge,
          replace,
          // element props
          style,
          className,
          onClick,
          onFocus,
          onMouseEnter,
          onMouseLeave,
          onTouchStart,
          onTouchEnd,
          ...rest
        } = options

        const linkInfo = route.buildLink(options as any)

        if (linkInfo.type === 'external') {
          const { href } = linkInfo
          return { href }
        }

        const {
          handleClick,
          handleFocus,
          handleEnter,
          handleLeave,
          isActive,
          next,
        } = linkInfo

        const reactHandleClick = (e: Event) => {
          if (React.startTransition)
            // This is a hack for react < 18
            React.startTransition(() => {
              handleClick(e)
            })
          else handleClick(e)
        }

        const composeHandlers =
          (handlers: (undefined | ((e: any) => void))[]) =>
          (e: React.SyntheticEvent) => {
            if (e.persist) e.persist()
            handlers.forEach((handler) => {
              if (e.defaultPrevented) return
              if (handler) handler(e)
            })
          }

        // Get the active props
        const resolvedActiveProps: React.HTMLAttributes<HTMLAnchorElement> =
          isActive ? functionalUpdate(activeProps, {}) ?? {} : {}

        // Get the inactive props
        const resolvedInactiveProps: React.HTMLAttributes<HTMLAnchorElement> =
          isActive ? {} : functionalUpdate(inactiveProps, {}) ?? {}

        return {
          ...resolvedActiveProps,
          ...resolvedInactiveProps,
          ...rest,
          href: disabled ? undefined : next.href,
          onClick: composeHandlers([reactHandleClick, onClick]),
          onFocus: composeHandlers([handleFocus, onFocus]),
          onMouseEnter: composeHandlers([handleEnter, onMouseEnter]),
          onMouseLeave: composeHandlers([handleLeave, onMouseLeave]),
          target,
          style: {
            ...style,
            ...resolvedActiveProps.style,
            ...resolvedInactiveProps.style,
          },
          className:
            [
              className,
              resolvedActiveProps.className,
              resolvedInactiveProps.className,
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          ...(disabled
            ? {
                role: 'link',
                'aria-disabled': true,
              }
            : undefined),
          ['data-status']: isActive ? 'active' : undefined,
        }
      },
      Link: React.forwardRef((props: any, ref) => {
        const linkProps = route.linkProps(props)

        return (
          <a
            {...{
              ref: ref as any,
              ...linkProps,
              children:
                typeof props.children === 'function'
                  ? props.children({
                      isActive: (linkProps as any)['data-status'] === 'active',
                    })
                  : props.children,
            }}
          />
        )
      }) as any,
      MatchRoute: (opts) => {
        const { pending, caseSensitive, children, ...rest } = opts

        const params = route.matchRoute(rest as any, {
          pending,
          caseSensitive,
        })

        if (!params) {
          return null
        }

        return typeof opts.children === 'function'
          ? opts.children(params as any)
          : (opts.children as any)
      },
    }
  }

  const coreRouter = createRouter<TRouteConfig>({
    ...opts,
    createRouter: (router: Router<any, any, any>) => {
      const routerExt: Pick<Router<any, any, any>, 'useMatch' | 'useStore'> = {
        useStore: <T,>(selector?: (store: Router['store']) => T) => {
          return __useStoreValue(() => router.store, selector)
        },
        useMatch: (routeId, opts) => {
          const nearestMatch = useNearestMatch()

          const match = router.store.currentMatches.find(
            (d) => d.routeId === routeId,
          )

          if (opts?.strict ?? true) {
            invariant(
              match,
              `Could not find an active match for "${routeId as string}"!`,
            )

            invariant(
              nearestMatch.routeId == match?.routeId,
              `useMatch("${
                match?.routeId as string
              }") is being called in a component that is meant to render the '${
                nearestMatch.routeId
              }' route. Did you mean to 'useMatch("${
                match?.routeId as string
              }", { strict: false })' or 'useRoute("${
                match?.routeId as string
              }")' instead?`,
            )
          }

          __useStoreValue(() => match!.store)

          return match as any
        },
      }

      const routeExt = makeRouteExt(router.getRoute(rootRouteId), router)

      Object.assign(router, routerExt, routeExt)
    },
    createRoute: ({ router, route }) => {
      const routeExt = makeRouteExt(route, router)

      Object.assign(route, routeExt)
    },
    loadComponent: async (component) => {
      if (component.preload && typeof document !== 'undefined') {
        component.preload()
        // return await component.preload()
      }

      return component as any
    },
  })

  return coreRouter as any
}

export type RouterProps<
  TRouteConfig extends AnyRouteConfig = RouteConfig,
  TAllRouteInfo extends AnyAllRouteInfo = DefaultAllRouteInfo,
  TRouterContext = unknown,
> = RouterOptions<TRouteConfig, TRouterContext> & {
  router: Router<TRouteConfig, TAllRouteInfo, TRouterContext>
}

export function RouterProvider<
  TRouteConfig extends AnyRouteConfig = RouteConfig,
  TAllRouteInfo extends AnyAllRouteInfo = DefaultAllRouteInfo,
  TRouterContext = unknown,
>({
  router,
  ...rest
}: RouterProps<TRouteConfig, TAllRouteInfo, TRouterContext>) {
  router.update(rest)

  const [, , currentMatches] = __useStoreValue(
    () => router.store,
    (s) => [s.status, s.pendingMatches, s.currentMatches],
  )

  React.useEffect(router.mount, [router])

  return (
    <>
      <routerContext.Provider value={{ router: router as any }}>
        <matchesContext.Provider value={[undefined!, ...currentMatches]}>
          <Outlet />
        </matchesContext.Provider>
      </routerContext.Provider>
    </>
  )
}

export function useRouter(): RegisteredRouter {
  const value = React.useContext(routerContext)
  warning(!value, 'useRouter must be used inside a <Router> component!')
  return value.router
}

export function useRouterStore(): RegisteredRouter['store'] {
  const router = useRouter()
  return __useStoreValue(() => router.store)
}

export function useMatches(): RouteMatch[] {
  return React.useContext(matchesContext)
}

export function useMatch<
  TId extends keyof RegisteredAllRouteInfo['routeInfoById'],
  TStrict extends boolean = true,
>(
  routeId: TId,
  opts?: { strict?: TStrict },
): TStrict extends true
  ? RouteMatch<
      RegisteredAllRouteInfo,
      RegisteredAllRouteInfo['routeInfoById'][TId]
    >
  :
      | RouteMatch<
          RegisteredAllRouteInfo,
          RegisteredAllRouteInfo['routeInfoById'][TId]
        >
      | undefined {
  const router = useRouter()
  const match = router.useMatch(routeId as any, opts) as any
  __useStoreValue(() => match?.store)
  return match
}

export function useNearestMatch(): RouteMatch<
  RegisteredAllRouteInfo,
  RouteInfo
> {
  const runtimeMatch = useMatches()[0]
  invariant(runtimeMatch, `Could not find a nearest match!`)
  __useStoreValue(() => runtimeMatch.store)
  return runtimeMatch as any
}

export function useRoute<
  TId extends keyof RegisteredAllRouteInfo['routeInfoById'],
>(
  routeId: TId,
): Route<RegisteredAllRouteInfo, RegisteredAllRouteInfo['routeInfoById'][TId]> {
  const router = useRouter()
  return router.useRoute(routeId as any) as any
}

export function useLoaderData<
  TId extends keyof RegisteredAllRouteInfo['routeInfoById'],
  TStrict extends boolean = true,
>(
  routeId: TId,
  opts?: { strict?: TStrict },
): TStrict extends true
  ? RegisteredAllRouteInfo['routeInfoById'][TId]['loaderData']
  : RegisteredAllRouteInfo['routeInfoById'][TId]['loaderData'] | undefined {
  const router = useRouter()
  const match = router.useMatch(routeId as any, opts) as any
  return __useStoreValue(() => match?.store.loaderData)
}

export function useSearch<T = RegisteredAllRouteInfo['fullSearchSchema']>(
  selector?: (search: RegisteredAllRouteInfo['fullSearchSchema']) => T,
): T {
  const router = useRouter()
  return __useStoreValue(() => router.store.currentLocation.search, selector)
}

export function useParams<T = RegisteredAllRouteInfo['allParams']>(
  selector?: (params: RegisteredAllRouteInfo['allParams']) => T,
): T {
  const router = useRouter()
  return __useStoreValue(
    () => last(router.store.currentMatches)?.params as any,
    selector,
  )
}

export function linkProps<TTo extends string = '.'>(
  props: MakeLinkPropsOptions<RegisteredAllRouteInfo, '/', TTo>,
): React.AnchorHTMLAttributes<HTMLAnchorElement> {
  const router = useRouter()
  return router.linkProps(props as any)
}

export function MatchRoute<TTo extends string = '.'>(
  props: MakeMatchRouteOptions<RegisteredAllRouteInfo, '/', TTo>,
): JSX.Element {
  const router = useRouter()
  return React.createElement(router.MatchRoute, props as any)
}

export function Outlet() {
  const router = useRouter()
  const matches = useMatches().slice(1)
  const match = matches[0]

  const defaultPending = React.useCallback(() => null, [])

  __useStoreValue(() => match?.store)

  const Inner = React.useCallback((props: { match: RouteMatch }): any => {
    if (props.match.store.status === 'error') {
      throw props.match.store.error
    }

    if (props.match.store.status === 'success') {
      return React.createElement(
        (props.match.__.component as any) ??
          router.options.defaultComponent ??
          Outlet,
      )
    }

    if (props.match.store.status === 'loading') {
      throw props.match.__.loadPromise
    }

    invariant(
      false,
      'Idle routeMatch status encountered during rendering! You should never see this. File an issue!',
    )
  }, [])

  if (!match) {
    return null
  }

  const PendingComponent = (match.__.pendingComponent ??
    router.options.defaultPendingComponent ??
    defaultPending) as any

  const errorComponent =
    match.__.errorComponent ?? router.options.defaultErrorComponent

  return (
    <matchesContext.Provider value={matches}>
      <React.Suspense fallback={<PendingComponent />}>
        <CatchBoundary
          key={match.routeId}
          errorComponent={errorComponent}
          match={match as any}
        >
          <Inner match={match} />
        </CatchBoundary>
      </React.Suspense>
      {/* Provide a suffix suspense boundary to make sure the router is
  ready to be dehydrated on the server */}
      {/* {router.options.ssrFooter && match.matchId === rootRouteId ? (
        <React.Suspense fallback={null}>
          {(() => {
            if (router.store.pending) {
              throw router.navigationPromise
            }

            return router.options.ssrFooter()
          })()}
        </React.Suspense>
      ) : null} */}
    </matchesContext.Provider>
  )
}

class CatchBoundary extends React.Component<{
  children: any
  errorComponent: any
  match: RouteMatch
}> {
  state = {
    error: false,
    info: undefined,
  }

  componentDidCatch(error: any, info: any) {
    console.error(`Error in route match: ${this.props.match.matchId}`)
    console.error(error)

    this.setState({
      error,
      info,
    })
  }

  render() {
    return (
      <CatchBoundaryInner
        {...this.props}
        errorState={this.state}
        reset={() => this.setState({})}
      />
    )
  }
}

// This is the messiest thing ever... I'm either seriously tired (likely) or
// there has to be a better way to reset error boundaries when the
// router's location key changes.
function CatchBoundaryInner(props: {
  children: any
  errorComponent: any
  errorState: { error: unknown; info: any }
  reset: () => void
}) {
  const [activeErrorState, setActiveErrorState] = React.useState(
    props.errorState,
  )
  const router = useRouter()
  const errorComponent = props.errorComponent ?? DefaultErrorBoundary

  React.useEffect(() => {
    if (activeErrorState) {
      let prevKey = router.store.currentLocation.key
      return createRoot(() =>
        createEffect(() => {
          if (router.store.currentLocation.key !== prevKey) {
            prevKey = router.store.currentLocation.key
            setActiveErrorState({} as any)
          }
        }),
      )
    }

    return
  }, [activeErrorState])

  React.useEffect(() => {
    if (props.errorState.error) {
      setActiveErrorState(props.errorState)
    }
    props.reset()
  }, [props.errorState.error])

  if (activeErrorState.error) {
    return React.createElement(errorComponent, activeErrorState)
  }

  return props.children
}

export function DefaultErrorBoundary({ error }: { error: any }) {
  return (
    <div style={{ padding: '.5rem', maxWidth: '100%' }}>
      <strong style={{ fontSize: '1.2rem' }}>Something went wrong!</strong>
      <div style={{ height: '.5rem' }} />
      <div>
        <pre>
          {error.message ? (
            <code
              style={{
                fontSize: '.7em',
                border: '1px solid red',
                borderRadius: '.25rem',
                padding: '.5rem',
                color: 'red',
              }}
            >
              {error.message}
            </code>
          ) : null}
        </pre>
      </div>
    </div>
  )
}

export function usePrompt(message: string, when: boolean | any): void {
  const router = useRouter()

  React.useEffect(() => {
    if (!when) return

    // TODO: bring this back
    // let unblock = router.history.block((transition) => {
    //   if (window.confirm(message)) {
    //     unblock()
    //     transition.retry()
    //   } else {
    //     router.store.currentLocation.pathname = window.location.pathname
    //   }
    // })

    // return unblock
  }, [when, message])
}

export function Prompt({ message, when, children }: PromptProps) {
  usePrompt(message, when ?? true)
  return (children ?? null) as React.ReactNode
}

function circularStringify(obj: any) {
  const seen = new Set()

  return (
    JSON.stringify(obj, (_, value) => {
      if (typeof value === 'function') {
        return undefined
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return
        seen.add(value)
      }
      return value
    }) || ''
  )
}
