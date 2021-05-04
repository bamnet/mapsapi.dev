export async function asyncFilter<T>(arr: Array<T>, predicate: ((arg0: T) => Promise<boolean>)) {
    return Promise.all(arr.map(predicate))
        .then((results) => arr.filter((_, index) => results[index]));
}