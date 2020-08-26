import Document, { Annotation, ParseAnnotation, is } from "@atjson/document";

type AnnotationNode = {
  value: Annotation<any>;
  type: "open" | "close";
  position: number;
  size: number;
  rank: number;
};

function compare(lhs: AnnotationNode, rhs: AnnotationNode) {
  if (lhs.position > rhs.position) {
    return -1;
  } else if (lhs.position < rhs.position) {
    return 1;
  } else {
    // Both are positioned at the same spot.
    // First decide by annotation size,
    // then annotation rank,
    // then annotation type
    if (lhs.type === rhs.type) {
      let multiplier = lhs.type === "close" ? -1 : 1;
      if (lhs.size > rhs.size) {
        return -1 * multiplier;
      } else if (lhs.size < rhs.size) {
        return 1 * multiplier;
      } else if (lhs.rank > rhs.rank) {
        return 1 * multiplier;
      } else if (lhs.rank < rhs.rank) {
        return -1 * multiplier;
      } else {
        if (lhs.value.type < rhs.value.type) {
          return 1 * multiplier;
        } else if (lhs.value.type > rhs.value.type) {
          return -1 * multiplier;
        }
        return 0;
      }
    }

    if (lhs.type === "open" && rhs.type === "close") {
      return 1;
    } else if (lhs.type === "close" && rhs.type === "open") {
      return -1;
    }
  }
  return 0;
}

export class LinkedList {
  head: Node<Annotation<any> | string> | null = null;

  insert(
    value: Annotation<any>,
    type: "open" | "close",
    position: number,
    size: number,
    rank: number
  ) {
    if (this.head == null) {
      let node = new Node(value, type, position, size, rank, null, null);
      this.head = node;
      return node;
    }

    let node = this.head;
    if (position < node.position) {
      while (position < node.position) {
        if (node.previous) {
          node = node.previous;
        } else {
          return node.prepend(value, type, position, size, rank);
        }
      }
    } else if (position > node.position) {
      while (position > node.position) {
        if (node.next) {
          node = node.next;
        } else {
          return node.append(value, type, position, size, rank);
        }
      }
      if (position < node.position && node.previous) {
        node = node.previous;
      }
    }

    let comparison = compare(
      node as AnnotationNode,
      {
        position,
        rank,
        size,
        type,
        value: value as Annotation<any>,
      } as AnnotationNode
    );
    let strategy =
      comparison === 1
        ? ("append" as const)
        : comparison === -1
        ? ("prepend" as const)
        : null;

    if (strategy == null) {
      throw new Error("ambiguous boundary");
    }

    if (strategy === "prepend") {
      let newNode = node.prepend(value, type, position, size, rank);
      if (newNode.previous == null) {
        this.head = newNode;
      }
      return newNode;
    } else {
      return node.append(value, type, position, size, rank);
    }
  }

  *[Symbol.iterator]() {
    let node = this.head;
    while (node != null) {
      yield node;
      node = node.next;
    }
  }

  toJSON() {
    let document: HIRNode[] = [];
    let parent: HIRNode[] | null = null;
    let wip: HIRNode[] = document;
    let skipNode = 0;

    let node = this.head;
    while (node != null) {
      if (node.type === "atom") {
        if (skipNode === 0) {
          wip.push(node.value as string);
        }
      } else if (node.type === "open") {
        if (is(node.value as Annotation<any>, ParseAnnotation)) {
          skipNode++;
          node = node.next;
          continue;
        }
        let children: HIRNode[] = [];
        let annotation = node.value as Annotation<any>;
        wip.push({
          type: annotation.type,
          attributes: annotation.attributes,
          children,
        });
        parent = wip;
        wip = children;
      } else if (node.type === "close" && parent) {
        if (is(node.value as Annotation<any>, ParseAnnotation)) {
          skipNode--;
          node = node.next;
          continue;
        }
        wip = parent;
      }
      node = node.next;
    }
    return document;
  }
}

class Node<T extends Annotation<any> | string> {
  value: T;
  type: "open" | "close" | "atom";
  position: number;
  size: number;
  rank: number;
  next: Node<Annotation<any> | string> | null;
  previous: Node<Annotation<any> | string> | null;

  constructor(
    value: T,
    type: "open" | "close" | "atom",
    position: number,
    size: number,
    rank: number,
    previous: Node<Annotation<any> | string> | null,
    next: Node<Annotation<any> | string> | null
  ) {
    this.value = value;
    this.next = next;
    this.previous = previous;
    this.position = position;
    this.size = size;
    this.rank = rank;
    this.type = type;
    if (previous) {
      previous.next = this;
    }
    if (next) {
      next.previous = this;
    }
  }

  prepend<R extends Annotation<any> | string>(
    value: R,
    type: "open" | "close" | "atom",
    position: number,
    size: number,
    rank: number
  ) {
    return new Node(value, type, position, size, rank, this.previous, this);
  }

  append<R extends Annotation<any> | string>(
    value: R,
    type: "open" | "close" | "atom",
    position: number,
    size: number,
    rank: number
  ) {
    return new Node(value, type, position, size, rank, this, this.next);
  }
}

type HIRNode = { type: string; attributes: any; children: HIRNode[] } | string;

export default class HeirarchicalIntermediateRepresentation {
  private list: LinkedList;

  constructor(doc: Document) {
    let list = new LinkedList();
    this.list = list;

    for (let annotation of doc.annotations) {
      let { start, end } = annotation;
      let size = end - start;
      list.insert(annotation, "open", start, size, annotation.rank);
      list.insert(annotation, "close", end, size, annotation.rank);
    }

    /*
    let stack: Node<Annotation<any>>[] = [];
    // Currently, we have a list of nodes that
    // aren't valid in structure— we need to
    // iterate through the list and add additional
    // nodes where necessary so when passed through
    // a renderer, the structure can create valid
    // HTML / XML / React / etc.
    for (let node of list) {
      if (node.type === "open") {
        stack.push(node as Node<Annotation<any>>);
      } else {
        let closeNode = stack.pop();

        if (closeNode && closeNode.value !== node.value) {
          let tempStack: Node<Annotation<any>>[] = [];
          while (closeNode && closeNode.value !== node.value) {
            tempStack.push(closeNode);
            node.prepend(
              closeNode.value,
              "close",
              node.position,
              closeNode.size,
              closeNode.rank
            );
            closeNode = stack.pop();
          }

          while (tempStack.length) {
            closeNode = tempStack.pop();
            if (closeNode) {
              stack.push(
                node.append(
                  closeNode.value,
                  "open",
                  node.position,
                  closeNode.size,
                  closeNode.rank
                ) as Node<Annotation<any>>
              );
            }
          }
        }
      }
    }*/

    let start = 0;
    for (let node of list) {
      let end = node.position;
      if (start === end) {
        continue;
      }
      let text = doc.content.slice(start, end);
      let textNode = node.prepend(text, "atom", start, text.length, 1000);
      if (node === list.head) {
        list.head = textNode;
      }
      start = end;
    }

    if (start !== doc.content.length) {
      let head = list.head;
      let text = doc.content.slice(start, doc.content.length);
      if (head == null) {
        list.head = new Node(
          text,
          "atom",
          start,
          text.length,
          1000,
          null,
          null
        );
      } else {
        let tail = head;
        while (tail.next != null) {
          tail = tail.next;
        }
        tail.append(text, "atom", start, text.length, 1000);
      }
    }

    this.list = list;
    console.log(this.ops());
  }

  *[Symbol.iterator]() {
    let node = this.list.head;
    while (node != null) {
      yield node;
      node = node.next;
    }
  }

  toJSON() {
    return this.list.toJSON();
  }

  ops() {
    let ops: string[] = [];
    let indent = 0;

    let node = this.list.head;
    while (node != null) {
      if (node.type === "atom") {
        ops.push(`${" ".repeat(indent)}TEXT "${node.value}"`);
      } else {
        if (node.type === "close") {
          //indent--;
        }
        ops.push(
          `${" ".repeat(indent)}${node.type.toUpperCase()} ${node.value.type}`
        );
        if (node.type === "open") {
          //indent++;
        }
      }
      node = node.next;
    }
    return ops.join("\n");
  }
}
