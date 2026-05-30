function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map(function (header) {
    return formatCsvValue(header.label || header.key);
  }).join(",");

  const bodyLines = rows.map(function (row) {
    return headers.map(function (header) {
      const value = typeof header.value === "function"
        ? header.value(row)
        : row[header.key];

      return formatCsvValue(value);
    }).join(",");
  });

  return `\uFEFF${[headerLine].concat(bodyLines).join("\r\n")}`;
}

function sendCsv(res, filename, csvContent) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csvContent);
}

function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}-${hour}${minute}`;
}

module.exports = {
  buildCsv,
  sendCsv,
  formatDateForFilename
};
