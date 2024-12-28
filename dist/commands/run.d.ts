import * as _oclif_core_lib_interfaces from '@oclif/core/lib/interfaces';
import { Command } from '@oclif/core';

declare class Run extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        init: _oclif_core_lib_interfaces.BooleanFlag<boolean>;
    };
    static args: {
        message: _oclif_core_lib_interfaces.Arg<string | undefined, Record<string, unknown>>;
    };
    private configService;
    private modelManager;
    private streamHandler;
    private openRouterAPI;
    private sessionManager;
    private rl;
    constructor(argv: string[], config: any);
    private parseOptions;
    run(): Promise<void>;
}

export { Run };
