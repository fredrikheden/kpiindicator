module powerbi.extensibility.visual {
    export function getMeasureIndex(dv: DataViewCategorical, measureName: string): number {
        let RetValue: number = -1;
        for (let i = 0; i < dv.values.length; i++) {
            if (dv.values[i].source.roles[measureName] === true) {
                RetValue = i;
                break;
            }
        }
        return RetValue;
    }

    export function getMetadataColumnIndex(dv: DataViewMetadata, measureOrCategoryName: string): number {
         for (var i = 0, ilen = dv.columns.length; i < ilen; i++) {
            var column = dv.columns[i];
            if ( column.roles.hasOwnProperty(measureOrCategoryName)) {
                return i;
            }
        }
        return -1;
    }

    
}
