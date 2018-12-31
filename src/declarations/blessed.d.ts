import * as blessed from 'blessed';

// the @types for blessed is not accurate, but still contains some good definitions.
// just need to alias the correct names that we use
declare module 'blessed' {
    export namespace widget {
        class Screen extends blessed.Widgets.Screen { }
        class Prompt extends blessed.Widgets.PromptElement { }
        class Question extends blessed.Widgets.QuestionElement { }
        class List extends blessed.Widgets.ListElement { }
        class Box extends blessed.Widgets.BoxElement { }
    }
}