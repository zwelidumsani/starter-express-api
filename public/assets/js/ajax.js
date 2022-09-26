$(document).ready(() => {
	$('#search_btn').click(() => {
		
		$.ajax({
			url: 'search/',
			type: 'GET',
			datatype: 'json'
			success: (data) => {
				console.log('products received!', data);
				$('#status').html(data);
			}
		});
		
	});
});