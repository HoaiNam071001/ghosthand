export namespace element {
	
	export class Suggestion {
	    selector: string;
	    occurrence: number;
	    matches: number;
	    unique: boolean;
	    stability: string;
	    note?: string;
	
	    static createFrom(source: any = {}) {
	        return new Suggestion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.selector = source["selector"];
	        this.occurrence = source["occurrence"];
	        this.matches = source["matches"];
	        this.unique = source["unique"];
	        this.stability = source["stability"];
	        this.note = source["note"];
	    }
	}

}

export namespace engine {
	
	export class CondPart {
	    path: number[];
	    case?: string;
	    kind: string;
	    ok: boolean;
	    known: boolean;
	    detail: string;
	    hit?: model.Rect;
	    score?: number;
	    text?: string;
	
	    static createFrom(source: any = {}) {
	        return new CondPart(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.case = source["case"];
	        this.kind = source["kind"];
	        this.ok = source["ok"];
	        this.known = source["known"];
	        this.detail = source["detail"];
	        this.hit = this.convertValues(source["hit"], model.Rect);
	        this.score = source["score"];
	        this.text = source["text"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CounterLoop {
	    ref: string;
	    count: number;
	    max: number;
	
	    static createFrom(source: any = {}) {
	        return new CounterLoop(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ref = source["ref"];
	        this.count = source["count"];
	        this.max = source["max"];
	    }
	}
	export class ElementPick {
	    selectors: string[];
	    occurrence: number;
	    role: string;
	    name: string;
	    box: model.Rect;
	    suggestions: element.Suggestion[];
	
	    static createFrom(source: any = {}) {
	        return new ElementPick(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.selectors = source["selectors"];
	        this.occurrence = source["occurrence"];
	        this.role = source["role"];
	        this.name = source["name"];
	        this.box = this.convertValues(source["box"], model.Rect);
	        this.suggestions = this.convertValues(source["suggestions"], element.Suggestion);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FindResult {
	    found: boolean;
	    score: number;
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	    area: model.Rect;
	    ms: number;
	    read?: string[];
	    colorDiff?: number;
	    count?: number;
	    all?: model.Rect[];
	
	    static createFrom(source: any = {}) {
	        return new FindResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.found = source["found"];
	        this.score = source["score"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	        this.area = this.convertValues(source["area"], model.Rect);
	        this.ms = source["ms"];
	        this.read = source["read"];
	        this.colorDiff = source["colorDiff"];
	        this.count = source["count"];
	        this.all = this.convertValues(source["all"], model.Rect);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FromPort {
	    ref: string;
	    port: string;
	
	    static createFrom(source: any = {}) {
	        return new FromPort(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ref = source["ref"];
	        this.port = source["port"];
	    }
	}
	export class ListColumn {
	    name: string;
	    key: string;
	
	    static createFrom(source: any = {}) {
	        return new ListColumn(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.key = source["key"];
	    }
	}
	export class ListPreview {
	    count: number;
	    columns: ListColumn[];
	    first?: any;
	
	    static createFrom(source: any = {}) {
	        return new ListPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	        this.columns = this.convertValues(source["columns"], ListColumn);
	        this.first = source["first"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NodeTest {
	    port: string;
	    known: boolean;
	    parts: CondPart[];
	    value?: string;
	    ms: number;
	
	    static createFrom(source: any = {}) {
	        return new NodeTest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.known = source["known"];
	        this.parts = this.convertValues(source["parts"], CondPart);
	        this.value = source["value"];
	        this.ms = source["ms"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class WaitProgress {
	    kind: string;
	    elapsedMs: number;
	    timeoutMs: number;
	    best: number;
	
	    static createFrom(source: any = {}) {
	        return new WaitProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.elapsedMs = source["elapsedMs"];
	        this.timeoutMs = source["timeoutMs"];
	        this.best = source["best"];
	    }
	}
	export class Progress {
	    loop: number;
	    loops: number;
	    step: number;
	    total: number;
	    nodeId?: string;
	    ref?: string;
	    clicks: number;
	    elapsedMs: number;
	    paused: boolean;
	    pausedBy?: string;
	    wait?: WaitProgress;
	    retry?: number;
	    retries?: number;
	    break?: string;
	    from?: FromPort;
	    counter?: CounterLoop;
	
	    static createFrom(source: any = {}) {
	        return new Progress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.loop = source["loop"];
	        this.loops = source["loops"];
	        this.step = source["step"];
	        this.total = source["total"];
	        this.nodeId = source["nodeId"];
	        this.ref = source["ref"];
	        this.clicks = source["clicks"];
	        this.elapsedMs = source["elapsedMs"];
	        this.paused = source["paused"];
	        this.pausedBy = source["pausedBy"];
	        this.wait = this.convertValues(source["wait"], WaitProgress);
	        this.retry = source["retry"];
	        this.retries = source["retries"];
	        this.break = source["break"];
	        this.from = this.convertValues(source["from"], FromPort);
	        this.counter = this.convertValues(source["counter"], CounterLoop);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class WebFindResult {
	    found: boolean;
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	    text: string;
	    selector: string;
	    covered: string;
	    offView: boolean;
	    hidden: number;
	    tab: string;
	    noTab: boolean;
	    noDialog: boolean;
	    count: number;
	    value: string;
	    ms: number;
	
	    static createFrom(source: any = {}) {
	        return new WebFindResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.found = source["found"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	        this.text = source["text"];
	        this.selector = source["selector"];
	        this.covered = source["covered"];
	        this.offView = source["offView"];
	        this.hidden = source["hidden"];
	        this.tab = source["tab"];
	        this.noTab = source["noTab"];
	        this.noDialog = source["noDialog"];
	        this.count = source["count"];
	        this.value = source["value"];
	        this.ms = source["ms"];
	    }
	}

}

export namespace main {
	
	export class DangerCheck {
	    ops: script.DangerOp[];
	    fingerprint: string;
	    confirmed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DangerCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ops = this.convertValues(source["ops"], script.DangerOp);
	        this.fingerprint = source["fingerprint"];
	        this.confirmed = source["confirmed"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DisplayInfo {
	    index: number;
	    rect: model.Rect;
	    work: model.Rect;
	    main: boolean;
	    current: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DisplayInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.rect = this.convertValues(source["rect"], model.Rect);
	        this.work = this.convertValues(source["work"], model.Rect);
	        this.main = source["main"];
	        this.current = source["current"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ScriptFile {
	    script: model.Script;
	    path: string;
	    revision: number;
	
	    static createFrom(source: any = {}) {
	        return new ScriptFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.script = this.convertValues(source["script"], model.Script);
	        this.path = source["path"];
	        this.revision = source["revision"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TemplateShot {
	    png: string;
	    scale: number;
	    w: number;
	    h: number;
	
	    static createFrom(source: any = {}) {
	        return new TemplateShot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.png = source["png"];
	        this.scale = source["scale"];
	        this.w = source["w"];
	        this.h = source["h"];
	    }
	}
	export class TextPreview {
	    port: string;
	    output: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new TextPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.output = source["output"];
	    }
	}

}

export namespace mcpsrv {
	
	export class Call {
	    // Go type: time
	    at: any;
	    tool: string;
	    ok: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Call(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.at = this.convertValues(source["at"], null);
	        this.tool = source["tool"];
	        this.ok = source["ok"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ClientConfig {
	    client: string;
	    where: string;
	    text: string;
	
	    static createFrom(source: any = {}) {
	        return new ClientConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.client = source["client"];
	        this.where = source["where"];
	        this.text = source["text"];
	    }
	}
	export class ToolInfo {
	    name: string;
	    kind: string;
	    desc: string;
	
	    static createFrom(source: any = {}) {
	        return new ToolInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.desc = source["desc"];
	    }
	}

}

export namespace model {
	
	export class AppInfo {
	    name: string;
	    id: string;
	    pid: number;
	    windows: number;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.id = source["id"];
	        this.pid = source["pid"];
	        this.windows = source["windows"];
	    }
	}
	export class Point {
	    x: number;
	    y: number;
	    ax?: string;
	    ay?: string;
	    xVar?: string;
	    yVar?: string;
	
	    static createFrom(source: any = {}) {
	        return new Point(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.ax = source["ax"];
	        this.ay = source["ay"];
	        this.xVar = source["xVar"];
	        this.yVar = source["yVar"];
	    }
	}
	export class Cond {
	    kind: string;
	    not?: boolean;
	    template?: string;
	    templateScale?: number;
	    threshold?: number;
	    matchMode?: string;
	    colorTol?: number;
	    searchArea?: string;
	    findText?: string;
	    textExact?: boolean;
	    textAccent?: boolean;
	    occurrence?: number;
	    selectors?: string[];
	    elementApp?: string;
	    points?: Point[];
	    color?: string;
	    tolerance?: number;
	    left?: string;
	    op?: string;
	    right?: string;
	    conds?: Cond[];
	
	    static createFrom(source: any = {}) {
	        return new Cond(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.not = source["not"];
	        this.template = source["template"];
	        this.templateScale = source["templateScale"];
	        this.threshold = source["threshold"];
	        this.matchMode = source["matchMode"];
	        this.colorTol = source["colorTol"];
	        this.searchArea = source["searchArea"];
	        this.findText = source["findText"];
	        this.textExact = source["textExact"];
	        this.textAccent = source["textAccent"];
	        this.occurrence = source["occurrence"];
	        this.selectors = source["selectors"];
	        this.elementApp = source["elementApp"];
	        this.points = this.convertValues(source["points"], Point);
	        this.color = source["color"];
	        this.tolerance = source["tolerance"];
	        this.left = source["left"];
	        this.op = source["op"];
	        this.right = source["right"];
	        this.conds = this.convertValues(source["conds"], Cond);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Case {
	    key: string;
	    label?: string;
	    op?: string;
	    match?: string;
	    cond?: Cond;
	
	    static createFrom(source: any = {}) {
	        return new Case(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.label = source["label"];
	        this.op = source["op"];
	        this.match = source["match"];
	        this.cond = this.convertValues(source["cond"], Cond);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Edge {
	    id: string;
	    from: string;
	    port: string;
	    to: string;
	
	    static createFrom(source: any = {}) {
	        return new Edge(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.from = source["from"];
	        this.port = source["port"];
	        this.to = source["to"];
	    }
	}
	export class FlowGuideDoc {
	    flow: string;
	    commonFields: string;
	    example: string;
	
	    static createFrom(source: any = {}) {
	        return new FlowGuideDoc(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.flow = source["flow"];
	        this.commonFields = source["commonFields"];
	        this.example = source["example"];
	    }
	}
	export class Group {
	    id: string;
	    name: string;
	    members: string[];
	    collapsed?: boolean;
	    color?: string;
	    from?: string;
	
	    static createFrom(source: any = {}) {
	        return new Group(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.members = source["members"];
	        this.collapsed = source["collapsed"];
	        this.color = source["color"];
	        this.from = source["from"];
	    }
	}
	export class InputTarget {
	    stepId: string;
	    field: string;
	
	    static createFrom(source: any = {}) {
	        return new InputTarget(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stepId = source["stepId"];
	        this.field = source["field"];
	    }
	}
	export class KV {
	    key: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new KV(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	    }
	}
	export class LogLine {
	    atMs: number;
	    level: string;
	    msg: string;
	
	    static createFrom(source: any = {}) {
	        return new LogLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.atMs = source["atMs"];
	        this.level = source["level"];
	        this.msg = source["msg"];
	    }
	}
	export class NumVar {
	    field: string;
	    expr: string;
	
	    static createFrom(source: any = {}) {
	        return new NumVar(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.field = source["field"];
	        this.expr = source["expr"];
	    }
	}
	
	export class Pos {
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new Pos(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class Rect {
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	
	    static createFrom(source: any = {}) {
	        return new Rect(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	    }
	}
	export class Retry {
	    count?: number;
	    delayMs?: number;
	
	    static createFrom(source: any = {}) {
	        return new Retry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	        this.delayMs = source["delayMs"];
	    }
	}
	export class StepError {
	    code: string;
	    message: string;
	    detail?: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new StepError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.message = source["message"];
	        this.detail = source["detail"];
	    }
	}
	export class StepResult {
	    nodeId: string;
	    ref: string;
	    status: string;
	    port?: string;
	    output?: Record<string, any>;
	    error?: StepError;
	    logs?: LogLine[];
	    attempts: number;
	    loop: number;
	    shot?: string;
	    changes?: Record<string, any>;
	    // Go type: time
	    startedAt: any;
	    durationMs: number;
	
	    static createFrom(source: any = {}) {
	        return new StepResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nodeId = source["nodeId"];
	        this.ref = source["ref"];
	        this.status = source["status"];
	        this.port = source["port"];
	        this.output = source["output"];
	        this.error = this.convertValues(source["error"], StepError);
	        this.logs = this.convertValues(source["logs"], LogLine);
	        this.attempts = source["attempts"];
	        this.loop = source["loop"];
	        this.shot = source["shot"];
	        this.changes = source["changes"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.durationMs = source["durationMs"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RunRecord {
	    id: string;
	    script: string;
	    source: string;
	    // Go type: time
	    startedAt: any;
	    durationMs: number;
	    status: string;
	    error?: string;
	    message?: string;
	    nodes: number;
	    inputs?: Record<string, any>;
	    results: StepResult[];
	    truncated?: number;
	
	    static createFrom(source: any = {}) {
	        return new RunRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.script = source["script"];
	        this.source = source["source"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.durationMs = source["durationMs"];
	        this.status = source["status"];
	        this.error = source["error"];
	        this.message = source["message"];
	        this.nodes = source["nodes"];
	        this.inputs = source["inputs"];
	        this.results = this.convertValues(source["results"], StepResult);
	        this.truncated = source["truncated"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RunSummary {
	    id: string;
	    script: string;
	    source: string;
	    // Go type: time
	    startedAt: any;
	    durationMs: number;
	    status: string;
	    error?: string;
	    message?: string;
	    nodes: number;
	
	    static createFrom(source: any = {}) {
	        return new RunSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.script = source["script"];
	        this.source = source["source"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.durationMs = source["durationMs"];
	        this.status = source["status"];
	        this.error = source["error"];
	        this.message = source["message"];
	        this.nodes = source["nodes"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Schedule {
	    path: string;
	    time: string;
	    repeat: string;
	    days: number[];
	    preset: string;
	    minimize: boolean;
	    notify: string;
	    notifyTarget: string;
	    notifyOn: string;
	    screenshot: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Schedule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.time = source["time"];
	        this.repeat = source["repeat"];
	        this.days = source["days"];
	        this.preset = source["preset"];
	        this.minimize = source["minimize"];
	        this.notify = source["notify"];
	        this.notifyTarget = source["notifyTarget"];
	        this.notifyOn = source["notifyOn"];
	        this.screenshot = source["screenshot"];
	    }
	}
	export class ScriptMeta {
	    createdBy?: string;
	
	    static createFrom(source: any = {}) {
	        return new ScriptMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.createdBy = source["createdBy"];
	    }
	}
	export class ScriptInput {
	    key: string;
	    label: string;
	    type: string;
	    default?: any;
	    required?: boolean;
	    min?: number;
	    max?: number;
	    options?: string[];
	    hint?: string;
	    targets?: InputTarget[];
	
	    static createFrom(source: any = {}) {
	        return new ScriptInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.label = source["label"];
	        this.type = source["type"];
	        this.default = source["default"];
	        this.required = source["required"];
	        this.min = source["min"];
	        this.max = source["max"];
	        this.options = source["options"];
	        this.hint = source["hint"];
	        this.targets = this.convertValues(source["targets"], InputTarget);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Step {
	    id: string;
	    type: string;
	    ref: string;
	    name?: string;
	    pos?: Pos;
	    breakpoint?: boolean;
	    points: Point[];
	    button: string;
	    clicks: number;
	    clickInterval: number;
	    holdMs: number;
	    dragMs: number;
	    dragFromPrev: boolean;
	    dragRelative: boolean;
	    coordSpace?: string;
	    text: string;
	    typeMode?: string;
	    keys: string[];
	    keyMode: string;
	    modifiers: string[];
	    delayAfter: number;
	    jitterMs: number;
	    jitterPx: number;
	    enabled: boolean;
	    direction?: string;
	    amount?: number;
	    target?: string;
	    app?: string;
	    webBrowser?: boolean;
	    selectors?: string[];
	    tab?: string;
	    webGone?: boolean;
	    webClear?: boolean;
	    webEnter?: boolean;
	    skipFocusCheck?: boolean;
	    webScope?: string;
	    webBackground?: boolean;
	    readFrom?: string;
	    attr?: string;
	    scrollMode?: string;
	    scrollIn?: string[];
	    template?: string;
	    templateScale?: number;
	    threshold?: number;
	    matchMode?: string;
	    colorTol?: number;
	    timeoutMs?: number;
	    intervalMs?: number;
	    searchArea?: string;
	    imageSource?: string;
	    imageFrom?: string;
	    dx?: number;
	    dy?: number;
	    findBy?: string;
	    elementApp?: string;
	    findText?: string;
	    textExact?: boolean;
	    elementAct?: string;
	    uiEvent?: string;
	    textAccent?: boolean;
	    minCount?: number;
	    maxCount?: number;
	    occurrence?: number;
	    pageAll?: boolean;
	    selectionOnly?: boolean;
	    readNear?: string;
	    readSpan?: number;
	    readPattern?: string;
	    readNumber?: boolean;
	    readChange?: boolean;
	    retry?: Retry;
	    human?: string;
	    numVars?: NumVar[];
	    shotArea?: string;
	    display?: number;
	    shotRect?: Rect;
	    saveDir?: string;
	    fileName?: string;
	    toClipboard?: boolean;
	    waitMode?: string;
	    stableMs?: number;
	    diffPct?: number;
	    clipOp?: string;
	    filePath?: string;
	    method?: string;
	    url?: string;
	    query?: KV[];
	    headers?: KV[];
	    bodyType?: string;
	    body?: string;
	    form?: KV[];
	    fileOp?: string;
	    fileAppend?: boolean;
	    cells?: string[];
	    sheet?: string;
	    filePattern?: string;
	    sysOp?: string;
	    volume?: number;
	    at?: string;
	    ifPassed?: string;
	    useNtp?: boolean;
	    shape?: string;
	    shapeW?: number;
	    shapeH?: number;
	    closed?: boolean;
	    color?: string;
	    tolerance?: number;
	    winOp?: string;
	    winApp?: string;
	    winTitle?: string;
	    winMatch?: string;
	    winPreset?: string;
	    winRect?: Rect;
	    appOp?: string;
	    appName?: string;
	    appMatch?: string;
	    appForce?: boolean;
	    tabOp?: string;
	    browser?: string;
	    tabMatch?: string;
	    tabFrom?: string;
	    normZoom?: boolean;
	    normFullscreen?: boolean;
	    normSize?: boolean;
	    normPopups?: boolean;
	    shellLang?: string;
	    script?: string;
	    shellEnv?: KV[];
	    shortcutName?: string;
	    procOp?: string;
	    procName?: string;
	    procMatch?: string;
	    cpuBelow?: number;
	    powerOp?: string;
	    countdownSec?: number;
	    displayOp?: string;
	    displayValue?: string;
	    soundWait?: boolean;
	    notifyTitle?: string;
	    zipOp?: string;
	    zipTo?: string;
	    inputOp?: string;
	    inputHotkey?: string;
	    inputLayout?: string;
	    cond?: Cond;
	    cases?: Case[];
	    value?: string;
	    max?: number;
	    listFrom?: string;
	    endStatus?: string;
	    message?: string;
	    varName?: string;
	    varOp?: string;
	    pattern?: string;
	    matchAll?: boolean;
	    separator?: string;
	    replaceFrom?: string;
	    replaceTo?: string;
	    replaceRegex?: boolean;
	    stripAccents?: boolean;
	    caseMode?: string;
	    trim?: boolean;
	    numOp?: string;
	    decimals?: number;
	    numStyle?: string;
	    dateLayout?: string;
	
	    static createFrom(source: any = {}) {
	        return new Step(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.ref = source["ref"];
	        this.name = source["name"];
	        this.pos = this.convertValues(source["pos"], Pos);
	        this.breakpoint = source["breakpoint"];
	        this.points = this.convertValues(source["points"], Point);
	        this.button = source["button"];
	        this.clicks = source["clicks"];
	        this.clickInterval = source["clickInterval"];
	        this.holdMs = source["holdMs"];
	        this.dragMs = source["dragMs"];
	        this.dragFromPrev = source["dragFromPrev"];
	        this.dragRelative = source["dragRelative"];
	        this.coordSpace = source["coordSpace"];
	        this.text = source["text"];
	        this.typeMode = source["typeMode"];
	        this.keys = source["keys"];
	        this.keyMode = source["keyMode"];
	        this.modifiers = source["modifiers"];
	        this.delayAfter = source["delayAfter"];
	        this.jitterMs = source["jitterMs"];
	        this.jitterPx = source["jitterPx"];
	        this.enabled = source["enabled"];
	        this.direction = source["direction"];
	        this.amount = source["amount"];
	        this.target = source["target"];
	        this.app = source["app"];
	        this.webBrowser = source["webBrowser"];
	        this.selectors = source["selectors"];
	        this.tab = source["tab"];
	        this.webGone = source["webGone"];
	        this.webClear = source["webClear"];
	        this.webEnter = source["webEnter"];
	        this.skipFocusCheck = source["skipFocusCheck"];
	        this.webScope = source["webScope"];
	        this.webBackground = source["webBackground"];
	        this.readFrom = source["readFrom"];
	        this.attr = source["attr"];
	        this.scrollMode = source["scrollMode"];
	        this.scrollIn = source["scrollIn"];
	        this.template = source["template"];
	        this.templateScale = source["templateScale"];
	        this.threshold = source["threshold"];
	        this.matchMode = source["matchMode"];
	        this.colorTol = source["colorTol"];
	        this.timeoutMs = source["timeoutMs"];
	        this.intervalMs = source["intervalMs"];
	        this.searchArea = source["searchArea"];
	        this.imageSource = source["imageSource"];
	        this.imageFrom = source["imageFrom"];
	        this.dx = source["dx"];
	        this.dy = source["dy"];
	        this.findBy = source["findBy"];
	        this.elementApp = source["elementApp"];
	        this.findText = source["findText"];
	        this.textExact = source["textExact"];
	        this.elementAct = source["elementAct"];
	        this.uiEvent = source["uiEvent"];
	        this.textAccent = source["textAccent"];
	        this.minCount = source["minCount"];
	        this.maxCount = source["maxCount"];
	        this.occurrence = source["occurrence"];
	        this.pageAll = source["pageAll"];
	        this.selectionOnly = source["selectionOnly"];
	        this.readNear = source["readNear"];
	        this.readSpan = source["readSpan"];
	        this.readPattern = source["readPattern"];
	        this.readNumber = source["readNumber"];
	        this.readChange = source["readChange"];
	        this.retry = this.convertValues(source["retry"], Retry);
	        this.human = source["human"];
	        this.numVars = this.convertValues(source["numVars"], NumVar);
	        this.shotArea = source["shotArea"];
	        this.display = source["display"];
	        this.shotRect = this.convertValues(source["shotRect"], Rect);
	        this.saveDir = source["saveDir"];
	        this.fileName = source["fileName"];
	        this.toClipboard = source["toClipboard"];
	        this.waitMode = source["waitMode"];
	        this.stableMs = source["stableMs"];
	        this.diffPct = source["diffPct"];
	        this.clipOp = source["clipOp"];
	        this.filePath = source["filePath"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.query = this.convertValues(source["query"], KV);
	        this.headers = this.convertValues(source["headers"], KV);
	        this.bodyType = source["bodyType"];
	        this.body = source["body"];
	        this.form = this.convertValues(source["form"], KV);
	        this.fileOp = source["fileOp"];
	        this.fileAppend = source["fileAppend"];
	        this.cells = source["cells"];
	        this.sheet = source["sheet"];
	        this.filePattern = source["filePattern"];
	        this.sysOp = source["sysOp"];
	        this.volume = source["volume"];
	        this.at = source["at"];
	        this.ifPassed = source["ifPassed"];
	        this.useNtp = source["useNtp"];
	        this.shape = source["shape"];
	        this.shapeW = source["shapeW"];
	        this.shapeH = source["shapeH"];
	        this.closed = source["closed"];
	        this.color = source["color"];
	        this.tolerance = source["tolerance"];
	        this.winOp = source["winOp"];
	        this.winApp = source["winApp"];
	        this.winTitle = source["winTitle"];
	        this.winMatch = source["winMatch"];
	        this.winPreset = source["winPreset"];
	        this.winRect = this.convertValues(source["winRect"], Rect);
	        this.appOp = source["appOp"];
	        this.appName = source["appName"];
	        this.appMatch = source["appMatch"];
	        this.appForce = source["appForce"];
	        this.tabOp = source["tabOp"];
	        this.browser = source["browser"];
	        this.tabMatch = source["tabMatch"];
	        this.tabFrom = source["tabFrom"];
	        this.normZoom = source["normZoom"];
	        this.normFullscreen = source["normFullscreen"];
	        this.normSize = source["normSize"];
	        this.normPopups = source["normPopups"];
	        this.shellLang = source["shellLang"];
	        this.script = source["script"];
	        this.shellEnv = this.convertValues(source["shellEnv"], KV);
	        this.shortcutName = source["shortcutName"];
	        this.procOp = source["procOp"];
	        this.procName = source["procName"];
	        this.procMatch = source["procMatch"];
	        this.cpuBelow = source["cpuBelow"];
	        this.powerOp = source["powerOp"];
	        this.countdownSec = source["countdownSec"];
	        this.displayOp = source["displayOp"];
	        this.displayValue = source["displayValue"];
	        this.soundWait = source["soundWait"];
	        this.notifyTitle = source["notifyTitle"];
	        this.zipOp = source["zipOp"];
	        this.zipTo = source["zipTo"];
	        this.inputOp = source["inputOp"];
	        this.inputHotkey = source["inputHotkey"];
	        this.inputLayout = source["inputLayout"];
	        this.cond = this.convertValues(source["cond"], Cond);
	        this.cases = this.convertValues(source["cases"], Case);
	        this.value = source["value"];
	        this.max = source["max"];
	        this.listFrom = source["listFrom"];
	        this.endStatus = source["endStatus"];
	        this.message = source["message"];
	        this.varName = source["varName"];
	        this.varOp = source["varOp"];
	        this.pattern = source["pattern"];
	        this.matchAll = source["matchAll"];
	        this.separator = source["separator"];
	        this.replaceFrom = source["replaceFrom"];
	        this.replaceTo = source["replaceTo"];
	        this.replaceRegex = source["replaceRegex"];
	        this.stripAccents = source["stripAccents"];
	        this.caseMode = source["caseMode"];
	        this.trim = source["trim"];
	        this.numOp = source["numOp"];
	        this.decimals = source["decimals"];
	        this.numStyle = source["numStyle"];
	        this.dateLayout = source["dateLayout"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Script {
	    version: number;
	    name: string;
	    region?: Rect;
	    loops: number;
	    maxMinutes: number;
	    steps: Step[];
	    start: string;
	    edges: Edge[];
	    anchorMode?: string;
	    inputs?: ScriptInput[];
	    human?: string;
	    keepAwake?: boolean;
	    meta?: ScriptMeta;
	    groups?: Group[];
	
	    static createFrom(source: any = {}) {
	        return new Script(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.name = source["name"];
	        this.region = this.convertValues(source["region"], Rect);
	        this.loops = source["loops"];
	        this.maxMinutes = source["maxMinutes"];
	        this.steps = this.convertValues(source["steps"], Step);
	        this.start = source["start"];
	        this.edges = this.convertValues(source["edges"], Edge);
	        this.anchorMode = source["anchorMode"];
	        this.inputs = this.convertValues(source["inputs"], ScriptInput);
	        this.human = source["human"];
	        this.keepAwake = source["keepAwake"];
	        this.meta = this.convertValues(source["meta"], ScriptMeta);
	        this.groups = this.convertValues(source["groups"], Group);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	export class StepTypeDoc {
	    type: string;
	    label: string;
	    desc: string;
	    fields: string[];
	    pinnable: string[];
	    example: string;
	    outputs: string[];
	    ports: string[];
	
	    static createFrom(source: any = {}) {
	        return new StepTypeDoc(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.label = source["label"];
	        this.desc = source["desc"];
	        this.fields = source["fields"];
	        this.pinnable = source["pinnable"];
	        this.example = source["example"];
	        this.outputs = source["outputs"];
	        this.ports = source["ports"];
	    }
	}
	export class WindowInfo {
	    id: number;
	    title: string;
	    app: string;
	    appId: string;
	    pid: number;
	    box: Rect;
	    minimized: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WindowInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.app = source["app"];
	        this.appId = source["appId"];
	        this.pid = source["pid"];
	        this.box = this.convertValues(source["box"], Rect);
	        this.minimized = source["minimized"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace perm {
	
	export class Item {
	    id: string;
	    name: string;
	    state: string;
	    hint: string;
	    note: string;
	    manual: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.state = source["state"];
	        this.hint = source["hint"];
	        this.note = source["note"];
	        this.manual = source["manual"];
	    }
	}

}

export namespace samples {
	
	export class Info {
	    id: string;
	    name: string;
	    description: string;
	    app: string;
	    level: number;
	    page: string;
	    real: boolean;
	    prep?: string;
	    steps: string[];
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.app = source["app"];
	        this.level = source["level"];
	        this.page = source["page"];
	        this.real = source["real"];
	        this.prep = source["prep"];
	        this.steps = source["steps"];
	    }
	}

}

export namespace script {
	
	export class DangerOp {
	    ref: string;
	    op: string;
	    folder?: string;
	    pattern?: string;
	    target?: string;
	    lang?: string;
	    script?: string;
	    dir?: string;
	
	    static createFrom(source: any = {}) {
	        return new DangerOp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ref = source["ref"];
	        this.op = source["op"];
	        this.folder = source["folder"];
	        this.pattern = source["pattern"];
	        this.target = source["target"];
	        this.lang = source["lang"];
	        this.script = source["script"];
	        this.dir = source["dir"];
	    }
	}
	export class EmbedResult {
	    script: model.Script;
	    groupId: string;
	    nodes: number;
	    renamedInput?: Record<string, string>;
	    droppedEnds: number;
	
	    static createFrom(source: any = {}) {
	        return new EmbedResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.script = this.convertValues(source["script"], model.Script);
	        this.groupId = source["groupId"];
	        this.nodes = source["nodes"];
	        this.renamedInput = source["renamedInput"];
	        this.droppedEnds = source["droppedEnds"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace session {
	
	export class Options {
	    countdown: number;
	    path?: string;
	    source?: string;
	    preset?: string;
	    from?: string;
	    only?: boolean;
	    step?: boolean;
	    stopAt?: string;
	    nodes?: string[];
	    seedRun?: string;
	    pins?: Record<string, model.StepResult>;
	    maxMinutes?: number;
	    shotEach?: boolean;
	    noHistory?: boolean;
	    confirmDanger?: string;
	
	    static createFrom(source: any = {}) {
	        return new Options(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.countdown = source["countdown"];
	        this.path = source["path"];
	        this.source = source["source"];
	        this.preset = source["preset"];
	        this.from = source["from"];
	        this.only = source["only"];
	        this.step = source["step"];
	        this.stopAt = source["stopAt"];
	        this.nodes = source["nodes"];
	        this.seedRun = source["seedRun"];
	        this.pins = this.convertValues(source["pins"], model.StepResult, true);
	        this.maxMinutes = source["maxMinutes"];
	        this.shotEach = source["shotEach"];
	        this.noHistory = source["noHistory"];
	        this.confirmDanger = source["confirmDanger"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Status {
	    runId: string;
	    script: string;
	    path?: string;
	    source: string;
	    preset?: string;
	    state: string;
	    // Go type: time
	    startedAt: any;
	    durationMs: number;
	    progress?: engine.Progress;
	    error?: string;
	    failedStep?: string;
	    reached?: boolean;
	    timedOut?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runId = source["runId"];
	        this.script = source["script"];
	        this.path = source["path"];
	        this.source = source["source"];
	        this.preset = source["preset"];
	        this.state = source["state"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.durationMs = source["durationMs"];
	        this.progress = this.convertValues(source["progress"], engine.Progress);
	        this.error = source["error"];
	        this.failedStep = source["failedStep"];
	        this.reached = source["reached"];
	        this.timedOut = source["timedOut"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace store {
	
	export class APISettings {
	    enabled: boolean;
	    port: number;
	    token?: string;
	
	    static createFrom(source: any = {}) {
	        return new APISettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.port = source["port"];
	        this.token = source["token"];
	    }
	}
	export class Draft {
	    script: model.Script;
	    path: string;
	    dirty: boolean;
	    savedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Draft(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.script = this.convertValues(source["script"], model.Script);
	        this.path = source["path"];
	        this.dirty = source["dirty"];
	        this.savedAt = source["savedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InputPreset {
	    name: string;
	    values: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new InputPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.values = source["values"];
	    }
	}
	export class InputMemory {
	    last?: Record<string, any>;
	    lastPreset?: string;
	    presets?: InputPreset[];
	    autoRun?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InputMemory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.last = source["last"];
	        this.lastPreset = source["lastPreset"];
	        this.presets = this.convertValues(source["presets"], InputPreset);
	        this.autoRun = source["autoRun"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class MCPSettings {
	    enabled: boolean;
	    run?: string;
	    maxMinutes?: number;
	    offTools?: string[];
	    clients?: Record<string, Array<string>>;
	    hideCaptureDot?: boolean;
	    nodePref?: string;
	
	    static createFrom(source: any = {}) {
	        return new MCPSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.run = source["run"];
	        this.maxMinutes = source["maxMinutes"];
	        this.offTools = source["offTools"];
	        this.clients = source["clients"];
	        this.hideCaptureDot = source["hideCaptureDot"];
	        this.nodePref = source["nodePref"];
	    }
	}
	export class StorageSettings {
	    scriptsDir?: string;
	    aiScriptsDir?: string;
	    shotsDir?: string;
	
	    static createFrom(source: any = {}) {
	        return new StorageSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scriptsDir = source["scriptsDir"];
	        this.aiScriptsDir = source["aiScriptsDir"];
	        this.shotsDir = source["shotsDir"];
	    }
	}
	export class Settings {
	    theme: string;
	    recent?: string[];
	    api: APISettings;
	    mcp: MCPSettings;
	    storage: StorageSettings;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.recent = source["recent"];
	        this.api = this.convertValues(source["api"], APISettings);
	        this.mcp = this.convertValues(source["mcp"], MCPSettings);
	        this.storage = this.convertValues(source["storage"], StorageSettings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StorageDefaults {
	    scriptsDir: string;
	    shotsDir: string;
	
	    static createFrom(source: any = {}) {
	        return new StorageDefaults(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scriptsDir = source["scriptsDir"];
	        this.shotsDir = source["shotsDir"];
	    }
	}

}

export namespace web {
	
	export class OutlineItem {
	    role: string;
	    name: string;
	    sel: string;
	    rect: model.Rect;
	    inView: boolean;
	    depth: number;
	    level?: number;
	    value?: string;
	    secret?: boolean;
	    checked?: string;
	    expanded?: string;
	    selected?: boolean;
	    disabled?: boolean;
	    focused?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new OutlineItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.name = source["name"];
	        this.sel = source["sel"];
	        this.rect = this.convertValues(source["rect"], model.Rect);
	        this.inView = source["inView"];
	        this.depth = source["depth"];
	        this.level = source["level"];
	        this.value = source["value"];
	        this.secret = source["secret"];
	        this.checked = source["checked"];
	        this.expanded = source["expanded"];
	        this.selected = source["selected"];
	        this.disabled = source["disabled"];
	        this.focused = source["focused"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Tab {
	    id: string;
	    title: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new Tab(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.url = source["url"];
	    }
	}
	export class PageCheck {
	    verdict: string;
	    useWeb: boolean;
	    signs: string[];
	    url: string;
	    title: string;
	    loaded: boolean;
	    elements: number;
	    outline: OutlineItem[];
	    tab: string;
	    tabs?: Tab[];
	
	    static createFrom(source: any = {}) {
	        return new PageCheck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.verdict = source["verdict"];
	        this.useWeb = source["useWeb"];
	        this.signs = source["signs"];
	        this.url = source["url"];
	        this.title = source["title"];
	        this.loaded = source["loaded"];
	        this.elements = source["elements"];
	        this.outline = this.convertValues(source["outline"], OutlineItem);
	        this.tab = source["tab"];
	        this.tabs = this.convertValues(source["tabs"], Tab);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Picked {
	    selectors: string[];
	    text: string;
	    tab: string;
	
	    static createFrom(source: any = {}) {
	        return new Picked(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.selectors = source["selectors"];
	        this.text = source["text"];
	        this.tab = source["tab"];
	    }
	}
	export class Status {
	    open: boolean;
	    tabs: Tab[];
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.open = source["open"];
	        this.tabs = this.convertValues(source["tabs"], Tab);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

