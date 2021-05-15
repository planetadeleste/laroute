<?php

namespace PlanetaDelEste\Laroute\Routes;

use Illuminate\Routing\Route;
use Illuminate\Routing\RouteCollectionInterface;
use Illuminate\Support\Arr;
use PlanetaDelEste\Laroute\Routes\Exceptions\ZeroRoutesException;

class Collection extends \Illuminate\Support\Collection
{
    public function __construct($routes, $filter, $namespace)
    {
        $this->items = $this->parseRoutes($routes, $filter, $namespace);
    }

    /**
     * Parse the routes into a jsonable output.
     *
     * @param RouteCollectionInterface $routes
     * @param string $filter
     * @param string $namespace
     *
     * @return array
     * @throws ZeroRoutesException
     */
    protected function parseRoutes($routes, $filter, $namespace)
    {
        $this->guardAgainstZeroRoutes($routes);

        $results = [];

        foreach ($routes as $route) {
            $results[] = $this->getRouteInformation($route, $filter, $namespace);
        }

        $results = array_values(array_filter($results));
        return collect($results)->sortBy('uri')->values()->all();
    }

    /**
     * Throw an exception if there aren't any routes to process
     *
     * @param RouteCollectionInterface $routes
     *
     * @throws ZeroRoutesException
     */
    protected function guardAgainstZeroRoutes($routes)
    {
        if (count($routes) < 1) {
            throw new ZeroRoutesException("You don't have any routes!");
        }
    }

    /**
     * Get the route information for a given route.
     *
     * @param $route \Illuminate\Routing\Route
     * @param $filter string
     * @param $namespace string
     *
     * @return array
     */
    protected function getRouteInformation(Route $route, $filter, $namespace): ?array
    {
        $host    = $route->domain();
        $methods = $route->methods();
        $uri     = $route->uri();
        $name    = $route->getName();
        $action  = $route->getActionName();
        $laroute = Arr::get($route->getAction(), 'laroute', null);

        if(!empty($namespace)) {
            $a = $route->getAction();

            if(isset($a['controller'])) {
                $action = str_replace($namespace.'\\', '', $action);
            }
        }

        switch ($filter) {
            case 'all':
                if($laroute === false) return null;
                break;
            case 'only':
                if($laroute !== true) return null;
                break;
            case 'match':
                $pattern = config('laroute.pattern', '(api).*$');
                if (!preg_match('/'.$pattern.'/', $uri)) {
                    return null;
                }
                break;
        }

        $arProperties = config('laroute.properties', ['host', 'methods', 'uri', 'name', 'action']);
        return call_user_func_array('compact', $arProperties);
    }

}
