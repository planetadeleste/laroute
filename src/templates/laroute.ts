import {
    chain,
    concat,
    has,
    intersection,
    isArray,
    isEmpty,
    isObject,
} from "lodash";
import config from "@/config/laroute";

type Params = string | number | string[] | Record<string, any>;
type Method = "GET" | "POST" | "HEAD" | "DELETE";
type LarouteParameters = Record<string, any>;

export interface LarouteRoute {
    uri: string;
    name: string;
    methods: Method[] | string[];
    host?: string;
    action?: string;
}

export interface LarouteConfig {
    absolute: boolean;
    rootUrl: string;
    routes: LarouteRoute[];
    prefix: string;
}

let arRoutes: LarouteRoute[] = [];
const req = require.context(
    "@/config/laroute",
    false,
    /^(?!.*(?:index.ts$)).*\.ts$/
);

req.keys().forEach((key) => {
    const obModule = req(key);
    arRoutes = concat(arRoutes, obModule.default);
});

config.routes = arRoutes;

const buildParams = (
    prefix: string | number,
    val: Params,
    top = true
): Params => {
    if (isArray(val) || isObject(val)) {
        return chain(val)
            .map((value, key) => {
                const sPrefix = `${prefix}[${isObject(val) ? key : ""}]`;
                return buildParams(top ? key : sPrefix, value, false);
            })
            .join("&")
            .value();
    } else {
        return encodeURIComponent(prefix) + "=" + encodeURIComponent(val);
    }
};

export default class Laroute {
    absolute!: boolean;
    rootUrl!: string;
    routes!: LarouteRoute[];
    prefix!: string;

    constructor() {
        this.absolute = config.absolute;
        this.rootUrl = config.rootUrl;
        this.prefix = config.prefix;
        this.routes = config.routes;
    }

    action(name: string, parameters: LarouteParameters = {}) {
        return this.route(name, parameters, this.getByAction(name));
    }

    route(
        name: string,
        parameters: LarouteParameters = {},
        route?: LarouteRoute
    ) {
        route = route || this.getByName(name);

        if (!route) {
            return "";
        }

        return this.toRoute(route, parameters);
    }

    url(url: string, parameters: LarouteParameters = {}) {
        parameters = parameters || [];

        const uri = url + "/" + parameters.join("/");

        return this.getCorrectUrl(uri);
    }

    // Generate a html link to the given url.
    // laroute.link_to('foo/bar', [title = url], [attributes = {}])
    link_to(url: string, title: string, attributes: LarouteParameters) {
        url = this.url(url);

        return this.getHtmlLink(url, title, attributes);
    }

    // Generate a html link to the given route.
    // laroute.link_to_route('route.name', [title=url], [parameters = {}], [attributes = {}])
    link_to_route(
        route: string,
        title: string,
        parameters: LarouteParameters,
        attributes: LarouteParameters
    ) {
        const url = this.route(route, parameters);

        return url ? this.getHtmlLink(url, title, attributes) : null;
    }

    // Generate a html link to the given controller action.
    // laroute.link_to_action('HomeController@getIndex', [title=url], [parameters = {}], [attributes = {}])
    link_to_action(
        action: string,
        title: string,
        parameters: LarouteParameters,
        attributes: LarouteParameters
    ) {
        const url = this.action(action, parameters);

        return url ? this.getHtmlLink(url, title, attributes) : null;
    }

    toRoute(route: LarouteRoute, parameters: LarouteParameters = {}) {
        const uri = this.replaceNamedParameters(route.uri, parameters);
        const bWithParams = intersection(route.methods, ["GET", "HEAD"]).length > 0;
        const qs = bWithParams ? this.getRouteQueryString(parameters) : "";

        if (this.absolute && this.isOtherHost(route) && route.host) {
            return "//" + route.host + "/" + uri + qs;
        }

        return this.getCorrectUrl(uri + qs);
    }

    isOtherHost(route: LarouteRoute) {
        return route.host && route.host != window.location.hostname;
    }

    replaceNamedParameters(uri: string, parameters: LarouteParameters = {}) {
        uri = uri.replace(/\{(.*?)\??\}/g, function (match, key) {
            if (has(parameters, key)) {
                const value = parameters[key];
                delete parameters[key];
                return value;
            } else {
                return match;
            }
        });

        // Strip out any optional parameters that were not given
        uri = uri.replace(/\/\{.*?\?\}/g, "");

        return uri;
    }

    getRouteQueryString(parameters: LarouteParameters = {}) {
        if (isEmpty(parameters) || !isObject(parameters)) {
            return "";
        }

        const sParams = buildParams("", parameters);
        return "?" + sParams;
    }

    getByName(name: string) {
        for (const key in this.routes) {
            if (has(this.routes, key) && this.routes[key].name === name) {
                return this.routes[key];
            }
        }
    }

    getByAction(action: string) {
        for (const key in this.routes) {
            if (has(this.routes, key) && this.routes[key].action === action) {
                return this.routes[key];
            }
        }
    }

    getCorrectUrl(uri: string) {
        const url = this.prefix + "/" + uri.replace(/^\/?/, "");

        if (!this.absolute) {
            return url;
        }

        return this.rootUrl.replace("//?$/", "") + url;
    }

    getLinkAttributes(attributes: LarouteParameters) {
        if (!attributes) {
            return "";
        }

        const attrs = [];
        for (const key in attributes) {
            if (has(attributes, key)) {
                attrs.push(key + '="' + attributes[key] + '"');
            }
        }

        return attrs.join(" ");
    }

    getHtmlLink(url: string, title: string, attributes: LarouteParameters) {
        title = title || url;
        const sAttributes = this.getLinkAttributes(attributes);

        return '<a href="' + url + '" ' + sAttributes + ">" + title + "</a>";
    }
}

export const route = (name: string, parameters: LarouteParameters = {}) => {
    return new Laroute().route(name, parameters);
};
